<img src="docs/social-preview.png" alt="openToolbox" width="100%">

# openToolbox

[English](README.md) · [Deutsch](README.de.md) · [中文](README.zh.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · **Português**

**Entregue uma ferramenta interna funcional como um único arquivo HTML. Sem servidor, sem
instalação, sem rede.**

O openToolbox é um modelo para ferramentas internas pequenas que precisam circular — por e-mail,
pen drive ou unidade compartilhada — e rodar com um duplo clique num notebook corporativo travado.
O arquivo *é* ao mesmo tempo a aplicação e o banco de dados: ao salvar, grava-se um novo arquivo
HTML com os dados embutidos nele.

Ele foi feito para uma forma de trabalhar bem específica:

> «Crie uma ferramenta para acompanhar auditorias de fornecedores, com base no openToolbox.»

Basta apontar um agente de IA para este repositório e ele já tem tudo de que precisa: o arcabouço e
o [`AGENTS.md`](AGENTS.md), que lhe diz exatamente o que perguntar e qual arquivo alterar.

Dá para encurtar mais um passo com o skill em [`plugin/`](plugin/): instalado uma vez, você descreve
a ferramenta que quer em qualquer diretório e o agente busca o modelo sozinho. Claude Code e Codex
leem o mesmo `SKILL.md` — instalação em [`plugin/README.md`](plugin/README.md). Não é obrigatório: a
frase acima funciona sem ele.

---

## Ver funcionando

[**Abrir as demonstrações ao vivo**](https://m-dohmen.github.io/openToolbox/demos/) — o mesmo
arcabouço como seis ferramentas diferentes, de um portfólio de projetos a um registro de embalagens.
Ou baixe qualquer uma de [`docs/demos/`](docs/demos/) e dê um duplo clique. O mesmo arquivo; sem servidor.

![A visão de lista](docs/screenshots/list.png)

Dois tipos de registro que se referenciam, colunas calculadas, filtros que contam e a versão ao lado
do título. Tudo isso sai de um único arquivo: `src/domain.js`.

![O painel](docs/screenshots/dashboard.png)

O painel consolida os dois tipos de registro. Desenhado **sem biblioteca de gráficos**: as barras são
larguras em CSS e o anel é um único círculo SVG. As duas visões imprimem como um PDF limpo.

---

## O que você recebe

- **Um arquivo.** Cerca de 240 KB, autossuficiente. Duplo clique e funciona. Tire o cabo de rede e
  continua funcionando — a única coisa que faltaria é o [contador de aberturas](#o-contador-de-aberturas),
  e ele está a um interruptor visível de ser desligado.
- **O arquivo é o banco de dados.** Salvar grava um novo HTML com os registros embutidos. Sem
  backend, sem armazenamento do navegador, sem sincronização.
- **Criptografia opcional.** AES-256-GCM, com chave derivada por PBKDF2 e 310.000 iterações. Sem a
  senha, o arquivo é um bloco ilegível.
- **Assistente de IA opcional.** Aponte-o para qualquer endpoint compatível com OpenAI. Ele lê os
  dados, aceita anexos como contexto adicional e — somente diante de uma instrução explícita — propõe
  alterações que você aprova antes de serem aplicadas.
- **Personalizável.** Cinco cores, nome do produto e um logotipo SVG, tudo editável na aplicação e
  guardado junto com o arquivo.
- **Modo claro e escuro**, atalhos de teclado, exportação para CSV e JSON, utilizável até a largura
  de um celular.
- **Importação de CSV com mapeamento de colunas**, para que dados reais entrem sem serem redigitados.
- **Dois idiomas de interface** (inglês, alemão), numa configuração que viaja com o arquivo.
- **Vários tipos de registro e relações entre eles**, quando um só não basta.
- **Painéis e folha de estilo para impressão**, porque análise costuma terminar num slide ou num anexo.
- **Um widget de prazos no painel**, ativado com um único campo do esquema — atrasados, esta semana,
  próximos 30 dias — agregado entre todas as entidades que o declararem.
- **Um registro de alterações**, preenchido a cada gravação com data, versão e o que mudou.
- **Prompts de exemplo embutidos**, para que quem receber o arquivo consiga mandar alterá-lo sem ter
  lido esta página.
- **Um bloqueio da página de configurações**, para que uma ferramenta nas mãos de quem apenas
  registra dados não seja reconfigurada por acidente.
- **Uma linha de cabeçalho editável e até cinco links** na barra escura do topo, apontando para o
  que acompanha a ferramenta.
- **Regras de validação entre campos**, aplicadas igualmente no formulário, na importação CSV e nas
  alterações propostas pela IA.
- **Um assistente de captura guiada** e um modo de recepção que abre o arquivo direto nele, para
  quem só precisa relatar uma coisa.
- **Mesclar uma cópia devolvida**, registro a registro e com comparação campo a campo.
- **Um registro de alterações em nível de campo**, deduzido automaticamente a cada gravação: qual registro, qual campo, antes e depois.
- **Anexos com um orçamento de tamanho visível**, porque uma ferramenta que já não dá para enviar por e-mail deixa de ser esta ferramenta.
- **Uma página inicial editável**, para que o arquivo se explique antes de mostrar uma tabela.
- **Desfazer/refazer para a sessão**, para cada criação, edição e exclusão, com Ctrl/Cmd+Z e
  Ctrl/Cmd+Y ou os dois botões na barra do arquivo.
- **Busca global em todos os campos de todas as entidades**, ao vivo, com contagem de resultados
  em cada aba e correspondências destacadas; além de filtros por tipo de campo na barra lateral,
  com etiquetas removíveis — apenas para a sessão, nada é gravado no arquivo.
- **Colunas ordenáveis em cada lista de entidades**: um clique ordena crescente, outro decrescente
  e um terceiro devolve a ordem do bloco de dados; a comparação segue o tipo de campo (números
  numericamente, datas cronologicamente) e os valores vazios ficam sempre no final.
- **Duplicar um registro** pela linha da tabela ou pelo formulário aberto: todos os valores são
  copiados, o título recebe o sufixo localizado e a cópia ganha seu próprio identificador; mesmo
  caminho de um registro manual — desfazer, registro de alterações e gravação apenas ao salvar.
- **Manutenção em massa com seleção múltipla**: linha a linha, por intervalo com Shift+clique ou
  todas as linhas visíveis de uma vez; barra de ações para definir um valor de enumeração ou excluir
  com confirmação com contagem — uma entrada no registro e um Ctrl+Z por ação.
- **Cartões de métricas no painel**: o esquema declara `metrics` e cada entrada vira um cartão —
  `count` (com filtro opcional), `sum(campo)` ou `avg(campo)` sobre campos numéricos; cálculo local
  na renderização, nada entra nos dados; um clique salta para a lista da entidade; declarações
  inválidas são rejeitadas com o motivo nomeado, não em silêncio.

## Início rápido

```bash
git clone https://github.com/m-dohmen/openToolbox
cd openToolbox
npm install
npm run build     # → dist/index.html
```

Abra `dist/index.html` num navegador. É só isso.

## Construir a sua própria ferramenta

Tudo que é específico do domínio está em **um arquivo**: `src/domain.js`. Troque-o, reconstrua,
pronto.

```js
export const SCHEMA = {
  singular: 'risk',
  plural: 'risks',
  titleField: 'name',
  list: ['name', 'owner', 'review', 'likelihood', 'impact'],
  facets: ['likelihood', 'category'],
  fields: [
    { key: 'name', label: 'Risco', type: 'text', required: true },
    { key: 'category', label: 'Categoria', type: 'enum', values: ['Operacional', 'Jurídico', 'TI'] },
    { key: 'review', label: 'Data de revisão', type: 'date' },
    { key: 'impact', label: 'Impacto', type: 'number' },
  ],
}
```

Um campo também pode ser **calculado** em vez de armazenado:

```js
{ key: 'score', label: 'Pontuação de risco', type: 'computed', compute: (r) => r.likelihood * r.impact }
```

`compute(record)` roda a cada renderização e o resultado **nunca é gravado no registro**. É
justamente esse o ponto: um valor derivado que se armazena fica errado no instante em que uma de
suas entradas muda, e ninguém percebe. Ainda assim dá para ordenar e pesquisar por ele, ele soma no
resumo e aparece na exportação CSV; no formulário é somente leitura, e a IA é avisada disso e
recusada nominalmente se tentar gravá-lo.

Só esse esquema já gera as colunas da tabela, o formulário de edição, os filtros laterais, a
exportação CSV, as instruções enviadas ao modelo de IA e a validação de qualquer coisa que o modelo
proponha de volta.

## Vários tipos de registro e relações

A maioria das ferramentas precisa de um único tipo de registro. Quando realmente existirem dois ou
mais que se referenciam (fornecedores e seus certificados, projetos e seus marcos), exporta-se
`ENTITIES` e acrescenta-se um campo `type: 'reference'` naquele que aponta para o outro.

No formulário, um campo de referência aparece como uma lista suspensa dos registros de destino; na
tabela, como uma etiqueta clicável com o título do destino. Um clique alterna para aquele tipo e
abre o registro. Excluir um registro ainda referenciado é bloqueado, e a mensagem diz exatamente o
que o referencia.

O `examples/portfolio.domain.js` — a origem da demonstração acima — usa todos os recursos de uma vez.

## Como os dados entram

**Importação de CSV com etapa de mapeamento.** Você escolhe um arquivo e a caixa de diálogo lista
cada coluna detectada ao lado de uma lista suspensa com os campos. Colunas cujo cabeçalho coincide
com o rótulo ou a chave de um campo já vêm pré-selecionadas, ignorando maiúsculas e pontuação. O
restante você atribui à mão, e o que não for atribuído fica de fora. Dá para acrescentar ao que já
existe ou substituir tudo.

O separador (`;`, vírgula, tabulação), as aspas e um BOM inicial são detectados a partir do próprio
arquivo, então uma exportação do Excel funciona sem preparo. Cada célula passa pela mesma checagem
de tipo que uma alteração proposta pela IA. **Nada falha em silêncio**: a tela de resultado nomeia
cada objeção com o número da linha, um valor ruim numa célula deixa o resto da linha intacto, e uma
linha sem título é pulada em vez de importada pela metade.

Os identificadores são sempre atribuídos pela aplicação, nunca lidos do arquivo.

## Números de versão e registro de alterações

**A versão** é texto livre nas configurações: `1.4`, `2026-T3`, `versão final para o comitê`. Ela
aparece como uma etiqueta ao lado do título e entra no nome do arquivo salvo
(`project-portfolio-2.1-2026-08-15.html`), de modo que numa troca de e-mails com quatro anexos se
reconhece o arquivo certo sem abrir nenhum.

**O registro de alterações** grava uma entrada por gravação: carimbo de tempo, versão e uma nota
pedida numa caixa de diálogo curta na hora de salvar. As entradas ficam junto com os dados, e não
junto com as configurações — assim, num arquivo criptografado, o registro fica **dentro** do
envelope, que é onde uma nota como «orçamento corrigido após o apontamento da auditoria» deve estar.

## Prompts de exemplo

O arquivo construído explica como modificá-lo. Nos pontos que normalmente se quer ajustar — o
cabeçalho, a tabela, os filtros, o painel, o formulário, a importação de CSV, a área de IA — aparece
uma caixa na cor de atenção dizendo o que gera aquela parte e oferecendo um prompt pronto para
entregar a um agente de IA, com botão de copiar.

A ideia: quem recebe o arquivo não precisa ter lido esta página, nem saber que `src/domain.js`
existe, para conseguir que a ferramenta seja alterada.

Vem ligado, porque o papel de um modelo é ensinar. **Desligue antes de entregar uma ferramenta
pronta a alguém que só vai inserir dados** — para essa pessoa, as caixas são apenas ruído.

## Por que um único arquivo

Três restrições que aparecem repetidamente em ambientes regulados e corporativos:

- Hospedar uma ferramenta pequena significa um servidor, uma URL, um responsável pela operação e,
  em geral, uma revisão de segurança.
- Instalar qualquer coisa exige direitos de administrador que o usuário não tem.
- Os dados não podem sair da máquina.

Um único arquivo HTML contorna as três. E ele é honesto sobre o que é: o usuário consegue ler todo o
código-fonte, e não existe serviço algum que possa mudar por trás dele.

## Bloquear as configurações

Configurações → Segurança → *Proteger as configurações* pede uma palavra e desabilita todos os
controles da página. Os campos continuam **visíveis e com os valores legíveis**: a mensagem é «agora
não», não «não é da sua conta». A mesma palavra os libera para a sessão atual; ao reabrir o arquivo
eles voltam a ficar bloqueados, para que a proteção não desapareça em silêncio depois do primeiro
salvamento do autor.

**É uma proteção contra descuidos, não uma fronteira de segurança.** Quem tem o arquivo tem o
código, e a entrada do bloqueio pode ser apagada do bloco de dados com um editor de texto. É uma
tampa sobre um interruptor. Para aquilo que realmente ninguém pode ler existe a criptografia — essa
é real.

A palavra também não é uma senha. Ela é guardada como um resumo SHA-256 com sal, para não ficar em
texto puro dentro do arquivo, mas o campo a mostra abertamente de propósito: para uma tampa ninguém
deveria reaproveitar uma senha de verdade, e «123» resolve. Não há regra de complexidade.

## O contador de aberturas

A única coisa, num arquivo construído, que vai à rede por iniciativa própria. Ao abrir, envia uma
única requisição GET levando **o tipo de ferramenta** (`SCHEMA.singular`, por exemplo `action item`).
Só isso: nenhum registro, nenhum conteúdo de campo, nenhum nome de arquivo, nada do que foi digitado.

Três decisões deliberadas, porque um arquivo assim acaba nas mãos de quem não o construiu:

- **O endpoint é uma configuração visível e editável**, pré-preenchida com o contador de quem fez o
  modelo. Dá para apontá-lo para o seu ou esvaziar o campo e não contar nada. A configuração viaja
  com o arquivo.
- **É um interruptor rotulado** em Configurações → Segurança, com o endereço de destino escrito ao
  lado. Não é um pixel escondido.
- **O caminho leva o tipo de ferramenta, nunca o nome do arquivo.** Esse nome pode ser alterado por
  quem recebe e, na prática, carrega nomes de clientes; mandá-lo a um terceiro seria vazar algo que
  pertence a quem recebeu o arquivo.

Com o contador desligado e a integração de IA desligada, o arquivo **não** abre nenhuma conexão de
rede. Verificável na aba de rede do navegador e assegurado pela suíte de testes.

## Limites que vale conhecer

- **O que não é salvo, se perde.** Não há salvamento automático — sem um arquivo de destino, ele não
  poderia existir. O ponto âmbar e o aviso ao fechar a aba são a única rede de proteção. Ctrl/Cmd+S
  salva.
- **Uma máquina, um arquivo.** Não há modo multiusuário. Duas pessoas editando o mesmo arquivo
  produzem duas verdades.
- **Gateways de e-mail barram anexos `.html`** mais vezes do que não. Envie compactado ou por
  transferência de arquivos, e teste o caminho uma vez com um arquivo de teste antes que isso
  realmente importe.
- **A criptografia protege os dados, não o acesso à aplicação.** Papéis e visões dentro de um arquivo
  que roda localmente seriam apenas fachada: quem tem o arquivo tem o código.

## Licença

Apache License 2.0. Os arquivos-fonte trazem um cabeçalho `SPDX-License-Identifier`.

Dependências: Preact (MIT), Vite (MIT) e Playwright apenas para testes (Apache 2.0). O arquivo
construído não carrega nada em tempo de execução.

---

> **Sobre esta tradução**: o [README em inglês](README.md) é a versão de referência; havendo
> divergência, prevalece ele. A documentação detalhada (arquitetura, funcionamento interno da
> integração de IA, segurança) está no [wiki](https://github.com/m-dohmen/openToolbox/wiki), somente
> em inglês.


<img src="docs/logo.svg" alt="openToolbox logo" width="96" height="96">
