# Mapa de Estudos

Aplicativo estático com uma página inicial de avaliações, uma tela própria para cada simulado e uma tela de revisão. Matemática começa com 70 questões do 6º ano. Cada tentativa usa 10 questões e cobre os seis tópicos da avaliação. A grade de Matemática salva o rascunho por questão e por tentativa. O banco inclui dez novas expressões longas com inteiros, sem raízes e sem frações. A regra `requiredSkill` garante pelo menos uma delas em cada nova tentativa.

## Acompanhar as notas

Os filtros da página inicial combinam matéria e data da prova escolar. Os limites de data são inclusivos. Uma avaliação com data desconhecida aparece quando o intervalo está vazio. O eixo horizontal do gráfico usa a data em que cada tentativa foi concluída. A tabela abaixo do gráfico apresenta os mesmos registros e dá acesso às revisões.

O histórico é local. O Mapa mantém a chave do simulado de Matemática original. Substitua a versão antiga no mesmo endereço e use o mesmo navegador para reaproveitar tentativas e rascunhos. O navegador mantém armazenamentos diferentes entre endereços diferentes e pode tratar arquivos abertos diretamente como armazenamentos distintos.

## Conquistas e exemplos

O mapa mostra o avatar, o total de conquistas e o próximo equipamento. A galeria explica os critérios por avaliação, matéria, tópico e no geral. As conquistas são calculadas com o histórico concluído do navegador. No resultado, os novos marcos ficam visíveis e um pop-up comemora as novidades ao finalizar. A animação respeita a opção de reduzir movimento do sistema.

As questões têm um campo `example` com um exemplo resolvido, exibido em um painel recolhível antes das respostas. Para listening em uma avaliação de Inglês, use `subjectId: "ingles"` e `skill: "listening"` e omita o exemplo. A versão atual de Matemática inclui 70 questões. Mantenha pelo menos dez questões diferentes em cada tópico para que o domínio possa ser conquistado.

## Números e temas

Use vírgula nos decimais e ponto nos milhares, como em `1.234,56`. Nas respostas, digitar um inteiro sem agrupar os milhares também funciona. O corretor lê um ponto seguido por três algarismos como agrupamento, por exemplo, `1.234` equivale a `1234`.

O seletor **Tema** no cabeçalho troca a aparência de todo o aplicativo e guarda a preferência neste navegador. Durante o simulado, Pixel art e Mundo em blocos mostram o avatar sobre a trilha de questões. Mundo em blocos usa terreno em camadas, dez emblemas de blocos e cinco avatares com equipamentos que evoluem junto com as conquistas. Clique em uma parada ou use Anterior e Próxima para fazer o avatar caminhar. Com movimento reduzido, ele muda diretamente de posição. Para incluir outro tema:

1. Adicione um objeto com `id` e `label` à lista em `temas.js`.
2. Em `estilos.css`, crie regras sob `:root[data-theme="seu-id"]` para as cores e seletores `[data-theme="seu-id"]` para detalhes visuais. O HTML resultante mantém os mesmos dados de tentativas.
3. Rode `python3 gerar_html.py` para incorporar a alteração à versão autônoma.

## Cadastrar outra avaliação

1. Crie um banco em `bancos/` seguindo a estrutura de `bancos/matematica.json`. Use um ID inédito por avaliação, inclusive quando ela for da mesma matéria. O banco e a entrada do catálogo usam o mesmo ID.
2. Adicione uma entrada em `catalogo.json`. `subjectId` agrupa períodos da mesma matéria. `title` e `grade` identificam a avaliação. `period` é uma descrição como “2026 · 3º trimestre”. `examDate` e `addedAt` usam AAAA-MM-DD. Campos desconhecidos de período e data da prova recebem `null`. Use `scratchpad: true` para oferecer a grade.
3. Teste a nova entrada, a abertura do simulado, os filtros e o gráfico após uma tentativa. Para imagens e áudios, use caminhos relativos a partir de `./` e inclua os arquivos no site. Formatos de resposta aceitos incluem escolha, verdadeiro/falso, lacunas, associação e cruzadinha. O motor usa bancos com até dez tópicos e sorteia dez questões por tentativa.

## Testar e publicar

Descompacte o pacote e execute `python3 -m http.server 8000` na pasta do `index.html` (no Windows, `python -m http.server 8000`). Abra http://localhost:8000 no navegador. A edição HTML autônoma pode ser aberta diretamente. Se o navegador bloquear o armazenamento de arquivos locais, use a versão servida por HTTP.

Para publicar no GitHub Pages, mantenha os arquivos e pastas juntos na origem de publicação escolhida. O site usa rotas com fragmento, como `#/simulado/matematica-6-ano`, e não requer regras de redirecionamento. O catálogo e os bancos JSON usam caminhos relativos, inclusive quando a publicação está no subdiretório de um repositório.

Para gerar novamente a edição autônoma, execute `python3 gerar_html.py`. O script incorpora catálogo, bancos, imagens e áudios locais cadastrados nas questões. Arte em pixel da interface incluída no pacote.

## Língua Portuguesa · Avaliação Somativa 2026

O catálogo inclui a avaliação do 6º ano com prova escolar em 23/11/2026, conforme o comunicado da escola. O banco traz 50 questões originais, com dez por tópico.

| Tópico | Questões |
| --- | ---: |
| Leitura e interpretação de fábulas | 10 |
| Tempos e modos verbais | 10 |
| Sentidos dos pretéritos | 10 |
| Sujeito, predicado e pontuação | 10 |
| Frase, oração e período | 10 |

Os exercícios partem da situação de leitura para trabalhar estratégia, inferência, evidência textual e efeitos de sentido. A abordagem toma como referência o [manual público de Língua Portuguesa do Sistema de Ensino Positivo, 6º ano, volume 1](https://livroscoordenacao.aprendebrasildigital.com.br/assets/pdfs/5c8b9b5fa32086616b3320f6/ef2.volume1.6ano.portugues.manual.pdf).

Os textos incluem recontos de [O leão e o rato](https://pt.wikisource.org/wiki/Fabulas_de_Esopo/O_Le%C3%A3o_e_o_Rato) e [A raposa e as uvas](https://pt.wikisource.org/wiki/Fabulas_de_Esopo/A_Rapoza_e_as_Uvas) e uma adaptação da [notícia sobre o acervo infantil da biblioteca do CEU Aventureiro, de 23/09/2026](https://www.joinville.sc.gov.br/noticias/novos-livros-ampliam-acervo-infantil-da-biblioteca-do-ceu-aventureiro/). As três leituras têm 12 linhas de referência e aparecem no próprio simulado. A ilustração WebP usada em duas questões está descrita em `midias/portugues-2026/manifesto.json`.

Para conferir o novo cadastro, selecione **Língua Portuguesa** e informe **23/11/2026** nos dois limites de data do Mapa de Estudos. Abra a avaliação, inicie uma tentativa, responda e recarregue para conferir a retomada. Após finalizar, confira a revisão e a nota no gráfico. Limpe os filtros para voltar a ver todo o catálogo.
