# Mapa de Estudos

Aplicativo estático com uma página inicial de avaliações, uma tela própria para cada simulado e uma tela de revisão. Matemática começa com 60 questões do 6º ano. Cada tentativa usa 10 questões e cobre os seis tópicos da avaliação. A grade de Matemática salva o rascunho por questão e por tentativa.

## Acompanhar as notas

Os filtros da página inicial combinam matéria e data da prova escolar. Os limites de data são inclusivos. Uma avaliação com data desconhecida aparece quando o intervalo está vazio. O eixo horizontal do gráfico usa a data em que cada tentativa foi concluída. A tabela abaixo do gráfico apresenta os mesmos registros e dá acesso às revisões.

O histórico é local. O Mapa mantém a chave do simulado de Matemática original. Substitua a versão antiga no mesmo endereço e use o mesmo navegador para reaproveitar tentativas e rascunhos. O navegador mantém armazenamentos diferentes entre endereços diferentes e pode tratar arquivos abertos diretamente como armazenamentos distintos.

## Conquistas e exemplos

O mapa mostra o avatar, o total de conquistas e o próximo equipamento. A galeria explica os critérios por avaliação, matéria, tópico e no geral. As conquistas são calculadas com o histórico concluído do navegador. No resultado, os novos marcos ficam visíveis e um pop-up comemora as novidades ao finalizar. A animação respeita a opção de reduzir movimento do sistema.

As questões têm um campo `example` com um exemplo resolvido, exibido em um painel recolhível antes das respostas. Para listening em uma avaliação de Inglês, use `subjectId: "ingles"` e `skill: "listening"` e omita o exemplo. A versão atual de Matemática inclui 60 questões. Mantenha pelo menos dez questões diferentes em cada tópico para que o domínio possa ser conquistado.

## Números e temas

Use vírgula nos decimais e ponto nos milhares, como em `1.234,56`. Nas respostas, digitar um inteiro sem agrupar os milhares também funciona. O corretor lê um ponto seguido por três algarismos como agrupamento, por exemplo, `1.234` equivale a `1234`.

O seletor **Tema** no cabeçalho troca a aparência de todo o aplicativo e guarda a preferência neste navegador. Para incluir outro tema:

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
