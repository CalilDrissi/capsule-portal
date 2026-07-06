server {
    listen      %ip%:%proxy_port%;
    server_name %domain_idn% %alias_idn%;
    error_log   /var/log/%web_system%/domains/%domain%.error.log error;

    location ^~ /.well-known/acme-challenge/ { proxy_pass http://%ip%:%web_port%; }

    include %home%/%user%/conf/web/%domain%/nginx.forcessl.conf*;

    root  %home%/%user%/web/%domain%/public_html;
    index index.html;
    client_max_body_size 250m;

    # Mayan backend (loopback docker port). Regex beats the SPA prefix below.
    location ~ ^/(api|static|media|admin|favicon\.ico) {
        proxy_pass http://127.0.0.1:8092;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
    }

    # SPA: serve built static assets, fall back to index.html for client routes.
    location /aide {
        root %home%/%user%/web/%domain%;
        index index.html;
        try_files $uri $uri/ =404;
    }

    location / { try_files $uri /index.html; }

    location /error/ { alias %home%/%user%/web/%domain%/document_errors/; }
    include %home%/%user%/conf/web/%domain%/nginx.conf_*;
}
