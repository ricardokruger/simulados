# Simulado de Matemática · 6º ano

O aplicativo usa HTML, CSS e JavaScript e contém 50 questões originais em seis tópicos. Em cada tentativa, o banco fornece 10 questões: três fáceis, cinco médias e duas de desafio. Cada tentativa cobre os seis tópicos. O banco inclui múltipla escolha, verdadeiro ou falso, lacunas, associação e cruzadinhas, além de questões que pedem interpretação de textos ou diagramas de ângulos. Cada questão vale 1 ponto. Em questões de cinco itens, cada acerto vale 0,2 ponto.

| Tópico | Questões |
| --- | ---: |
| Operações com números naturais | 9 |
| Expressões numéricas | 8 |
| Frações e porcentagens | 8 |
| Operações com números racionais | 9 |
| Medidas de ângulos | 8 |
| Unidades de comprimento | 8 |

## Usar e testar

- Em **Rascunho da conta**, digite na grade. As setas movem o cursor. **Linha** marca uma linha horizontal abaixo da célula selecionada. As contas são salvas por questão e aparecem na revisão.
- Cada tentativa só pode ser finalizada depois que as dez questões estiverem completas. A revisão reúne a nota, as respostas, o gabarito e as explicações.
- O histórico e o rascunho ficam no navegador e no endereço usados. Use a mesma origem e o mesmo perfil do navegador para continuar. Para teste local, abra um terminal na pasta descompactada, execute `python3 -m http.server 8000` e acesse http://localhost:8000. No Windows, use `python -m http.server 8000`.
- Há também uma edição HTML autônoma, distribuída separadamente. A persistência ao abrir um arquivo diretamente depende do navegador. A edição servida por HTTP ou HTTPS é a opção para manter um histórico no mesmo endereço.

## GitHub Pages

Coloque os arquivos descompactados na raiz da origem de publicação escolhida para o GitHub Pages, como a raiz do branch ou a pasta `docs`. Preserve a pasta `bancos/` junto ao `index.html`. O site carrega o banco por um caminho relativo, inclusive quando publicado no subdiretório de um repositório. Os diagramas são desenhados no navegador a partir do JSON.

A estrutura é `index.html` para a página, `estilos.css` para a interface, `motor.js` para sorteio e correção, `app.js` para interação e persistência e `bancos/matematica.json` para o conteúdo. O aplicativo efetua a correção no navegador. Os gabaritos fazem parte do JSON publicado.
