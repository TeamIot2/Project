from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image, ImageDraw, ImageFilter
from trimesh.visual.material import SimpleMaterial
from trimesh.visual.texture import TextureVisuals


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = ROOT / "public"
IMAGES_DIR = PUBLIC_DIR / "images" / "cube_faces"
MODELS_DIR = PUBLIC_DIR / "models"

TILE_SIZE = 768
ATLAS_COLS = 3
ATLAS_ROWS = 2
ATLAS_SIZE = (TILE_SIZE * ATLAS_COLS, TILE_SIZE * ATLAS_ROWS)
OUTLINE = (31, 41, 77, 255)


@dataclass(frozen=True)
class FaceSpec:
    key: str
    face_name: str
    colors: tuple[tuple[int, int, int], tuple[int, int, int]]


FACE_SPECS = [
    FaceSpec("temperature", "front", ((255, 181, 141), (255, 111, 121))),
    FaceSpec("humidity", "right", ((125, 229, 255), (70, 163, 255))),
    FaceSpec("co2", "back", ((163, 239, 185), (84, 195, 130))),
    FaceSpec("pressure", "left", ((201, 182, 255), (130, 104, 232))),
    FaceSpec("light", "top", ((255, 233, 135), (255, 183, 66))),
    FaceSpec("noise", "bottom", ((255, 162, 195), (255, 92, 132))),
]


def ensure_dirs() -> None:
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)


def gradient_background(size: int, c1: tuple[int, int, int], c2: tuple[int, int, int]) -> Image.Image:
    x = np.linspace(0, 1, size, dtype=np.float32)
    y = np.linspace(0, 1, size, dtype=np.float32)
    grid_x, grid_y = np.meshgrid(x, y)
    mix = (grid_x * 0.58 + grid_y * 0.42)[..., None]
    start = np.array(c1, dtype=np.float32)
    end = np.array(c2, dtype=np.float32)
    rgb = start * (1.0 - mix) + end * mix
    alpha = np.full((size, size, 1), 255.0, dtype=np.float32)
    arr = np.concatenate([rgb, alpha], axis=2).clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def add_frame(tile: Image.Image) -> None:
    draw = ImageDraw.Draw(tile)
    inset = 28
    draw.rounded_rectangle(
        (inset, inset, tile.width - inset, tile.height - inset),
        radius=58,
        outline=(255, 255, 255, 150),
        width=6,
    )
    draw.rounded_rectangle(
        (inset + 14, inset + 14, tile.width - inset - 14, tile.height - inset - 14),
        radius=48,
        outline=(255, 255, 255, 56),
        width=3,
    )


def add_sparkles(tile: Image.Image, color: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(tile)
    stars = [
        (130, 132, 17),
        (642, 154, 15),
        (600, 620, 13),
        (165, 600, 15),
        (365, 104, 12),
    ]
    for x, y, r in stars:
        draw.line((x, y - r, x, y + r), fill=color + (180,), width=4)
        draw.line((x - r, y, x + r, y), fill=color + (180,), width=4)


def add_medallion(tile: Image.Image) -> None:
    shadow = Image.new("RGBA", tile.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse((134, 148, 634, 648), fill=(0, 0, 0, 84))
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    tile.alpha_composite(shadow)

    medallion = Image.new("RGBA", tile.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(medallion)
    draw.ellipse((148, 130, 620, 602), fill=(255, 255, 255, 188))
    draw.ellipse((184, 166, 584, 566), fill=(255, 255, 255, 92))
    draw.ellipse((208, 190, 560, 542), fill=(255, 255, 255, 116))
    tile.alpha_composite(medallion)


def draw_temperature(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle((336, 206, 432, 488), radius=48, fill=(255, 247, 247, 255), outline=OUTLINE, width=12)
    draw.rounded_rectangle((366, 234, 402, 452), radius=18, fill=(255, 214, 214, 255), outline=OUTLINE, width=8)
    draw.ellipse((296, 430, 472, 606), fill=(255, 115, 102, 255), outline=OUTLINE, width=12)
    draw.rounded_rectangle((372, 304, 396, 500), radius=12, fill=(255, 93, 86, 255))
    draw.arc((254, 172, 510, 684), start=232, end=314, fill=(255, 160, 117, 255), width=14)


def draw_humidity(draw: ImageDraw.ImageDraw) -> None:
    droplets = [
        [(384, 206), (286, 386), (384, 548), (482, 386)],
        [(258, 304), (196, 426), (258, 532), (320, 426)],
        [(510, 302), (450, 420), (510, 528), (570, 420)],
    ]
    fills = [(72, 170, 255, 255), (138, 224, 255, 255), (105, 198, 255, 255)]
    for points, fill in zip(droplets, fills):
        draw.polygon(points, fill=fill, outline=OUTLINE)
    draw.ellipse((338, 262, 408, 332), fill=(255, 255, 255, 132))
    draw.ellipse((224, 350, 266, 392), fill=(255, 255, 255, 132))
    draw.ellipse((476, 348, 518, 390), fill=(255, 255, 255, 132))


def draw_co2(draw: ImageDraw.ImageDraw) -> None:
    cloud_fill = (121, 217, 147, 255)
    for box in ((258, 308, 482, 480), (204, 346, 388, 512), (350, 334, 558, 514)):
        draw.ellipse(box, fill=cloud_fill, outline=OUTLINE, width=10)
    draw.rounded_rectangle((236, 396, 528, 508), radius=56, fill=cloud_fill, outline=OUTLINE, width=10)
    draw.ellipse((246, 238, 320, 312), fill=(101, 208, 120, 255), outline=OUTLINE, width=8)
    draw.ellipse((454, 228, 530, 304), fill=(101, 208, 120, 255), outline=OUTLINE, width=8)
    draw.polygon([(244, 268), (212, 220), (286, 208)], fill=(85, 186, 104, 255), outline=OUTLINE)
    draw.polygon([(522, 260), (554, 210), (478, 202)], fill=(85, 186, 104, 255), outline=OUTLINE)
    for x, y, r in ((312, 414, 16), (382, 438, 18), (454, 412, 15)):
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(247, 255, 248, 255), outline=OUTLINE, width=5)


def draw_pressure(draw: ImageDraw.ImageDraw) -> None:
    draw.ellipse((220, 216, 548, 544), fill=(234, 221, 255, 255), outline=OUTLINE, width=12)
    draw.arc((280, 276, 488, 484), start=190, end=350, fill=(126, 104, 232, 255), width=18)
    draw.line((384, 380, 470, 312), fill=(255, 104, 148, 255), width=14)
    draw.ellipse((360, 356, 408, 404), fill=(255, 255, 255, 255), outline=OUTLINE, width=8)
    for angle in range(200, 341, 28):
        radians = math.radians(angle)
        x1 = 384 + math.cos(radians) * 118
        y1 = 380 + math.sin(radians) * 118
        x2 = 384 + math.cos(radians) * 138
        y2 = 380 + math.sin(radians) * 138
        draw.line((x1, y1, x2, y2), fill=OUTLINE, width=7)
    draw.arc((160, 164, 608, 612), start=225, end=315, fill=(255, 255, 255, 126), width=12)


def draw_light(draw: ImageDraw.ImageDraw) -> None:
    draw.ellipse((244, 228, 524, 508), fill=(255, 213, 76, 255), outline=OUTLINE, width=12)
    for angle in range(0, 360, 30):
        radians = math.radians(angle)
        inner = 174
        outer = 250
        x1 = 384 + math.cos(radians) * inner
        y1 = 368 + math.sin(radians) * inner
        x2 = 384 + math.cos(radians) * outer
        y2 = 368 + math.sin(radians) * outer
        draw.line((x1, y1, x2, y2), fill=(255, 191, 59, 255), width=16)
    draw.ellipse((314, 296, 356, 338), fill=(255, 255, 255, 156))
    draw.ellipse((426, 316, 462, 352), fill=(255, 255, 255, 124))
    draw.arc((300, 328, 468, 446), start=15, end=165, fill=OUTLINE, width=8)


def draw_noise(draw: ImageDraw.ImageDraw) -> None:
    speaker = [(230, 332), (314, 332), (404, 258), (404, 490), (314, 416), (230, 416)]
    draw.polygon(speaker, fill=(255, 122, 150, 255), outline=OUTLINE)
    for box in ((404, 254, 536, 494), (452, 218, 612, 530), (508, 182, 682, 566)):
        draw.arc(box, start=300, end=60, fill=(255, 92, 132, 255), width=16)
    draw.ellipse((288, 346, 330, 388), fill=(255, 255, 255, 120))


DRAWERS = {
    "temperature": draw_temperature,
    "humidity": draw_humidity,
    "co2": draw_co2,
    "pressure": draw_pressure,
    "light": draw_light,
    "noise": draw_noise,
}


def make_face_tile(spec: FaceSpec) -> Image.Image:
    tile = gradient_background(TILE_SIZE, spec.colors[0], spec.colors[1])
    add_frame(tile)
    add_medallion(tile)
    add_sparkles(tile, spec.colors[0])
    draw = ImageDraw.Draw(tile)
    DRAWERS[spec.key](draw)
    return tile


def save_tiles_and_atlas() -> Image.Image:
    atlas = Image.new("RGBA", ATLAS_SIZE, (0, 0, 0, 0))
    for index, spec in enumerate(FACE_SPECS):
        tile = make_face_tile(spec)
        tile.save(IMAGES_DIR / f"cube_face_{spec.key}.png")
        col = index % ATLAS_COLS
        row = index // ATLAS_COLS
        atlas.paste(tile, (col * TILE_SIZE, row * TILE_SIZE))
    atlas.save(IMAGES_DIR / "cube_sensor_atlas.png")
    return atlas


def tile_uv(col: int, row: int, inset_px: int = 10) -> list[tuple[float, float]]:
    u0 = (col * TILE_SIZE + inset_px) / ATLAS_SIZE[0]
    v0 = (row * TILE_SIZE + inset_px) / ATLAS_SIZE[1]
    u1 = ((col + 1) * TILE_SIZE - inset_px) / ATLAS_SIZE[0]
    v1 = ((row + 1) * TILE_SIZE - inset_px) / ATLAS_SIZE[1]
    return [(u0, v1), (u1, v1), (u1, v0), (u0, v0)]


def build_textured_cube(atlas: Image.Image) -> trimesh.Trimesh:
    faces = []
    vertices = []
    uvs = []

    face_defs = [
        ("front", [(-0.5, -0.5, 0.5), (0.5, -0.5, 0.5), (0.5, 0.5, 0.5), (-0.5, 0.5, 0.5)], 0),
        ("right", [(0.5, -0.5, 0.5), (0.5, -0.5, -0.5), (0.5, 0.5, -0.5), (0.5, 0.5, 0.5)], 1),
        ("back", [(0.5, -0.5, -0.5), (-0.5, -0.5, -0.5), (-0.5, 0.5, -0.5), (0.5, 0.5, -0.5)], 2),
        ("left", [(-0.5, -0.5, -0.5), (-0.5, -0.5, 0.5), (-0.5, 0.5, 0.5), (-0.5, 0.5, -0.5)], 3),
        ("top", [(-0.5, 0.5, 0.5), (0.5, 0.5, 0.5), (0.5, 0.5, -0.5), (-0.5, 0.5, -0.5)], 4),
        ("bottom", [(-0.5, -0.5, -0.5), (0.5, -0.5, -0.5), (0.5, -0.5, 0.5), (-0.5, -0.5, 0.5)], 5),
    ]

    for _, verts, atlas_index in face_defs:
        base = len(vertices)
        vertices.extend(verts)
        col = atlas_index % ATLAS_COLS
        row = atlas_index // ATLAS_COLS
        uvs.extend(tile_uv(col, row))
        faces.append([base + 0, base + 1, base + 2])
        faces.append([base + 0, base + 2, base + 3])

    material = SimpleMaterial(image=atlas)
    visual = TextureVisuals(uv=np.array(uvs, dtype=np.float32), image=atlas, material=material)
    mesh = trimesh.Trimesh(
        vertices=np.array(vertices, dtype=np.float32),
        faces=np.array(faces, dtype=np.int64),
        visual=visual,
        process=False,
    )
    rotation = trimesh.transformations.rotation_matrix(math.radians(28), [0, 1, 0])
    rotation = rotation @ trimesh.transformations.rotation_matrix(math.radians(-16), [1, 0, 0])
    mesh.apply_transform(rotation)
    mesh.metadata["name"] = "cube_asset_sensor_faces"
    return mesh


def main() -> None:
    ensure_dirs()
    atlas = save_tiles_and_atlas()
    mesh = build_textured_cube(atlas)
    out_path = MODELS_DIR / "cube_asset_sensor_faces.glb"
    mesh.export(out_path)
    print(f"saved_model={out_path}")
    for spec in FACE_SPECS:
        print(f"saved_face={IMAGES_DIR / f'cube_face_{spec.key}.png'}")
    print(f"saved_atlas={IMAGES_DIR / 'cube_sensor_atlas.png'}")


if __name__ == "__main__":
    main()
