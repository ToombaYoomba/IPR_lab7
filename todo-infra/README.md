# todo-infra

Содержит **только** PostgreSQL и Redis. Приложение (frontend/backend) здесь **отсутствует**.

## Контракт для приложения

| Параметр | dev | prod |
|---------|-----|------|
| PostgreSQL host | `postgres-0.postgres.lab6-dev.svc.cluster.local` | `postgres-0.postgres.lab6-prod.svc.cluster.local` |
| PostgreSQL port / DB | `5432` / `appdb` | `5432` / `appdb` |
| Credentials | Secret `infra-secret`: `DB_USER`, `DB_PASSWORD` | Secret `infra-secret`: `DB_USER`, `DB_PASSWORD` |
| Redis host | `redis.lab6-dev.svc.cluster.local` | `redis.lab6-prod.svc.cluster.local` |
| Redis port | `6379` | `6379` |

## Порядок деплоя

### Helm

```bash
# dev
helm upgrade --install todo-infra ./k8s/helm/postgres-infra \
  --namespace lab6-dev --create-namespace \
  -f ./k8s/helm/postgres-infra/values-dev.yaml

# prod
helm upgrade --install todo-infra ./k8s/helm/postgres-infra \
  --namespace lab6-prod --create-namespace \
  -f ./k8s/helm/postgres-infra/values-prod.yaml
```

### Kustomize

```bash
kubectl apply -k k8s/kustomization/overlays/dev
kubectl apply -k k8s/kustomization/overlays/prod
```

## Проверка

```bash
kubectl get pods,pvc,svc -n lab6-dev -l app=postgres
kubectl get pods,svc -n lab6-dev -l app=redis
```
