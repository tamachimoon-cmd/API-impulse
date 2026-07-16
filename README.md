# API Impulse

Monitor open source de disponibilidade, status HTTP e latência de APIs.

O **API Impulse** é o projeto #001 da série **LAB//ABERTO**: aplicações pequenas, funcionais e documentadas para estudo, demonstração em vídeo e contribuição com a comunidade.

## Funcionalidades do MVP

- Verificação manual de endpoints HTTP e HTTPS.
- Status HTTP, disponibilidade e tempo de resposta.
- Histórico local em memória com até 100 verificações.
- Gráfico de latência sem bibliotecas externas.
- Exportação do histórico em CSV.
- Proteção padrão contra destinos privados, locais e reservados.
- Interface responsiva.
- Testes unitários e de integração com o runner nativo do Node.js.
- Docker e GitHub Actions.

## Executar localmente

Requisito: Node.js 20 ou superior.

```bash
npm start
```

Abra `http://localhost:3000`.

Durante o desenvolvimento:

```bash
npm run dev
```

## Testes

```bash
npm run check
npm test
```

## Docker

```bash
docker compose up --build
```

## Endpoints internos

| Método | Rota | Função |
| --- | --- | --- |
| `GET` | `/api/health` | Verifica a saúde da aplicação |
| `POST` | `/api/check` | Verifica um endpoint |
| `GET` | `/api/checks` | Lista o histórico em memória |
| `DELETE` | `/api/checks` | Limpa o histórico |

Exemplo:

```bash
curl -X POST http://localhost:3000/api/check \
  -H 'content-type: application/json' \
  -d '{"url":"https://api.github.com"}'
```

## Segurança

Por padrão, o monitor bloqueia `localhost`, redes privadas, endereços reservados e link-local para reduzir riscos de SSRF.

Para testar APIs locais em um ambiente controlado:

```bash
ALLOW_PRIVATE_TARGETS=true npm start
```

Não habilite essa opção em uma instância pública.

## Roadmap

Consulte [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Contribuição

Leia [`CONTRIBUTING.md`](CONTRIBUTING.md) antes de abrir uma issue ou Pull Request.

## Independência

Este é um projeto pessoal e independente, criado para fins educacionais e de contribuição com a comunidade. Não representa, utiliza ou contém informações, códigos, processos ou propriedade intelectual de empregadores ou clientes do autor.

## Licença

Distribuído sob a licença MIT.
