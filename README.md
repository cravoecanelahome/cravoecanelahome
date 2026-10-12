# Cravo e Canela Flow

Criar um sistema de gestão de estoque, vendas e financeiro intuitivo para a loja de presentes e decorações Cravo e Canela Home (da Valdirene), adaptado tanto para celular quanto para notebook.

Requisitos principais desta primeira versão:
1. Interface extremamente simples, limpa e visual, amigável para quem tem pouca familiaridade com tecnologia.
2. Catálogo e Controle de Estoque:
   - Cadastro ágil de produtos com foto, nome, categoria (ex: aromatizadores, velas, vasos, decoração), quantidade em estoque, custo de compra da nota e preço de venda.
   - Indicadores visuais claros do status de estoque: em estoque (verde), acabando / reposição (amarelo) e esgotado (vermelho).
3. Cálculo Automático de Margens:
   - Ao cadastrar ou editar o preço e custo, calcular e exibir automaticamente a margem de lucro bruta (% e valor em R$).
4. Registro Rápido de Vendas e Baixa de Estoque:
   - Fluxo de venda simples em poucos cliques: selecionar o produto, quantidade, forma de pagamento (Pix, Cartão, Dinheiro) e confirmar a baixa imediata no estoque.
5. Painel Financeiro Mensal:
   - Dashboard com resumo visual do mês: faturamento total, custo das mercadorias vendidas, lucro acumulado e produtos mais vendidos.
6. Design responsivo e aconchegante, combinando com a identidade de uma loja de presentes e decoração de interiores (Cravo e Canela Home).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cravoecanelahome.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bfed6800-5991-44bf-ae39-19dac91b0ba9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
