use tauri::{
    webview::{DownloadEvent, NewWindowResponse},
    AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_opener::OpenerExt;

const HOME_URL: &str = "https://www.pinterest.com/";
const MAIN_WINDOW: &str = "main";

/// Atalhos de navegação que o webview nativo não oferece por padrão.
const SHORTCUTS_SCRIPT: &str = include_str!("shortcuts.js");

/// Hosts de login (OAuth) que precisam abrir dentro do app para a sessão funcionar.
const AUTH_HOSTS: &[&str] = &[
    "accounts.google.com",
    "www.facebook.com",
    "m.facebook.com",
    "facebook.com",
    "appleid.apple.com",
];

/// `true` se a URL pertence ao Pinterest (qualquer domínio regional) ou ao seu CDN.
fn is_pinterest(url: &Url) -> bool {
    let Some(host) = url.host_str() else {
        return false;
    };
    let mut labels = host.split('.');
    let regional = loop {
        match labels.next() {
            Some("pinterest") => {
                // Aceita pinterest.com, pinterest.de, pinterest.com.br, pinterest.co.uk...
                let Some(tld) = labels.next() else {
                    break false;
                };
                break match labels.next() {
                    None => tld.len() <= 3,
                    Some(sld) if matches!(sld, "com" | "co") => {
                        tld.len() == 2 && labels.next().is_none()
                    }
                    Some(_) => false,
                };
            }
            Some(_) => {}
            None => break false,
        }
    };
    regional || host == "pinimg.com" || host.ends_with(".pinimg.com")
}

fn is_auth(url: &Url) -> bool {
    url.host_str()
        .is_some_and(|host| AUTH_HOSTS.contains(&host))
}

/// URLs que devem ser carregadas dentro do app; o resto vai para o navegador padrão.
fn stays_in_app(url: &Url) -> bool {
    match url.scheme() {
        "http" | "https" => is_pinterest(url) || is_auth(url),
        // about:blank, blob:, data: etc. são usados internamente pelo site.
        _ => true,
    }
}

fn open_externally(app: &AppHandle, url: &Url) {
    if let Err(err) = app.opener().open_url(url.as_str(), None::<&str>) {
        eprintln!("falha ao abrir {url} no navegador: {err}");
    }
}

fn file_name_for(url: &Url) -> String {
    url.path_segments()
        .and_then(|mut segments| segments.next_back().map(str::to_owned))
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "pinterest-download".to_owned())
}

fn create_main_window(app: &AppHandle) -> tauri::Result<()> {
    let nav_app = app.clone();
    let popup_app = app.clone();
    let download_app = app.clone();

    WebviewWindowBuilder::new(
        app,
        MAIN_WINDOW,
        WebviewUrl::External(HOME_URL.parse().unwrap()),
    )
    .title("Quickerest")
    .inner_size(1200.0, 820.0)
    .min_inner_size(400.0, 500.0)
    .initialization_script(SHORTCUTS_SCRIPT)
    .on_navigation(move |url| {
        if stays_in_app(url) {
            true
        } else {
            open_externally(&nav_app, url);
            false
        }
    })
    .on_new_window(move |url, _features| {
        if is_auth(&url) {
            // Popups de login precisam manter o `window.opener`.
            NewWindowResponse::Allow
        } else if is_pinterest(&url) {
            if let Some(window) = popup_app.get_webview_window(MAIN_WINDOW) {
                let _ = window.navigate(url);
            }
            NewWindowResponse::Deny
        } else {
            open_externally(&popup_app, &url);
            NewWindowResponse::Deny
        }
    })
    .on_download(move |_webview, event| {
        match event {
            DownloadEvent::Requested { url, destination } => {
                if let Ok(dir) = download_app.path().download_dir() {
                    let name = destination
                        .file_name()
                        .map(|n| n.to_string_lossy().into_owned())
                        .unwrap_or_else(|| file_name_for(&url));
                    *destination = dir.join(name);
                }
            }
            DownloadEvent::Finished {
                path: Some(path),
                success: true,
                ..
            } => println!("download salvo em {}", path.display()),
            _ => {}
        }
        true
    })
    .build()?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }))
            .plugin(tauri_plugin_window_state::Builder::new().build());
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            create_main_window(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Quickerest");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn url(s: &str) -> Url {
        s.parse().unwrap()
    }

    #[test]
    fn pinterest_domains_stay_in_app() {
        for u in [
            "https://www.pinterest.com/",
            "https://br.pinterest.com/pin/123/",
            "https://www.pinterest.com.br/",
            "https://pinterest.co.uk/ideas/",
            "https://i.pinimg.com/originals/a.jpg",
            "https://accounts.google.com/o/oauth2/auth",
            "about:blank",
        ] {
            assert!(stays_in_app(&url(u)), "{u}");
        }
    }

    #[test]
    fn external_links_leave_app() {
        for u in [
            "https://www.etsy.com/listing/1",
            "https://notpinterest.com/",
            "https://pinterest.com.evil.example/",
            "https://example.com/?r=pinterest.com",
            "https://pinterest.evil.com/",
        ] {
            assert!(!stays_in_app(&url(u)), "{u}");
        }
    }

    #[test]
    fn download_name_falls_back() {
        assert_eq!(
            file_name_for(&url("https://i.pinimg.com/originals/a/b.jpg")),
            "b.jpg"
        );
        assert_eq!(
            file_name_for(&url("https://i.pinimg.com/")),
            "pinterest-download"
        );
    }
}
