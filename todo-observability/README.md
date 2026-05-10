# todo-observability

Стек наблюдаемости для todo-app: **Prometheus + Grafana + Grafana Tempo**.

Живёт отдельно от кода приложения (принцип лаб. №6).

## Доступ

| Сервис | URL | Логин / Пароль |
|--------|-----|----------------|
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3001 | admin / admin |
| Tempo HTTP API | http://localhost:3200 | — |
| OTLP HTTP (трейсы) | http://localhost:4318 | — |

## Запуск (только стек, без приложения)

```bash
cd todo-observability
docker compose up -d
```

Prometheus будет scrape-ить `host.docker.internal:3000/metrics`.  
Убедись что backend запущен и отдаёт `/metrics`.

## Проверка

```bash
# Метрики backend
curl http://localhost:3000/metrics

# Статус targets в Prometheus
open http://localhost:9090/targets

# Grafana — дашборд Lab7
open http://localhost:3001
```
