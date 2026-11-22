"""Empacota o Mapa de Estudos em um HTML autônomo."""
from base64 import b64encode
import json
import mimetypes
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent


def embed(relative):
    file = (ROOT / relative).resolve()
    if not file.is_relative_to(ROOT):
        raise ValueError(f"Recurso fora da pasta do site: {relative}")
    mime = mimetypes.guess_type(file.name)[0] or "application/octet-stream"
    return f"data:{mime};base64,{b64encode(file.read_bytes()).decode('ascii')}"


def build(output):
    catalog = json.loads((ROOT / "catalogo.json").read_text(encoding="utf-8"))
    data = {"catalog": catalog, "banks": {}, "art": {}, "media": {}}
    for entry in catalog["assessments"]:
        bank = json.loads((ROOT / entry["bankPath"]).read_text(encoding="utf-8"))
        if bank["id"] != entry["id"]:
            raise ValueError(f"Identificador do banco divergente: {entry['id']}")
        for question in bank["questions"]:
            for media in ("image", "audio"):
                resource = question.get(media)
                if resource and resource["src"] not in data["media"]:
                    data["media"][resource["src"]] = embed(resource["src"])
        data["banks"][bank["id"]] = bank

    page = (ROOT / "index.html").read_text(encoding="utf-8")
    for image in (ROOT / "arte").glob("*.png"):
        data["art"][image.stem] = embed(image.relative_to(ROOT))
        page = page.replace(f"./arte/{image.name}", data["art"][image.stem])

    style = (ROOT / "estilos.css").read_text(encoding="utf-8")
    page = page.replace('<link rel="stylesheet" href="./estilos.css">', f"<style>\n{style}</style>")
    scripts = []
    for match in re.findall(r'<script defer src="\./([^"]+)"></script>', page):
        source = (ROOT / match).read_text(encoding="utf-8")
        scripts.append(f"<script>\n{source}</script>")
    page = re.sub(r'  <script defer src="\./[^"]+"></script>\n', "", page)
    serialized = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    payload = f'<script type="application/json" id="map-data">{serialized}</script>'
    output.write_text(page.replace("</body>", payload + "\n" + "\n".join(scripts) + "\n</body>"),
                      encoding="utf-8")


if __name__ == "__main__":
    build(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "mapa_de_estudos.html")
