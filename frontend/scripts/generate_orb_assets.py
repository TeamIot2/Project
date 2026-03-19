from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image, ImageDraw, ImageFilter
from trimesh.visual.material import SimpleMaterial
from trimesh.visual.texture import TextureVisuals


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = ROOT / "public"
IMAGES_DIR = PUBLIC_DIR / "images" / "orbs"
MODELS_DIR = PUBLIC_DIR / "models"

TEX_W = 2048
TEX_H = 1024
OUTLINE = (35, 44, 78, 255)


def ensure_dirs() -> None:
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)


def vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    w, h = size
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    top_arr = np.array(top, dtype=np.float32)
    bottom_arr = np.array(bottom, dtype=np.float32)
    rgb = top_arr * (1.0 - y) + bottom_arr * y
    rgb = np.repeat(rgb[:, None, :], w, axis=1)
    alpha = np.full((h, w, 1), 255, dtype=np.uint8)
    return Image.fromarray(np.concatenate([rgb.astype(np.uint8), alpha], axis=2), "RGBA")


def add_glow(base: Image.Image, box: tuple[int, int, int, int], color: tuple[int, int, int], blur: int = 42, alpha: int = 150) -> None:
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse(box, fill=color + (alpha,))
    glow = glow.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(glow)


def draw_star_points(draw: ImageDraw.ImageDraw, cx: int, cy: int, outer: int, inner: int, fill: tuple[int, int, int, int], outline: tuple[int, int, int, int]) -> None:
    points = []
    for i in range(10):
        angle = math.radians(-90 + i * 36)
        radius = outer if i % 2 == 0 else inner
        points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
    draw.polygon(points, fill=fill, outline=outline)


def make_sun_texture() -> Image.Image:
    img = vertical_gradient((TEX_W, TEX_H), (255, 222, 121), (255, 146, 92))
    add_glow(img, (270, 180, 810, 720), (255, 243, 156), blur=70, alpha=120)
    add_glow(img, (1238, 180, 1778, 720), (255, 243, 156), blur=70, alpha=120)

    draw = ImageDraw.Draw(img)
    for cx in (540, 1508):
        for angle in range(0, 360, 30):
            radians = math.radians(angle)
            x1 = cx + math.cos(radians) * 180
            y1 = 500 + math.sin(radians) * 180
            x2 = cx + math.cos(radians) * 320
            y2 = 500 + math.sin(radians) * 320
            draw.line((x1, y1, x2, y2), fill=(255, 190, 64, 255), width=22)
        draw.ellipse((cx - 180, 320, cx + 180, 680), fill=(255, 215, 90, 255), outline=OUTLINE, width=10)
        draw.ellipse((cx - 76, 428, cx - 28, 474), fill=(OUTLINE[0], OUTLINE[1], OUTLINE[2], 255))
        draw.ellipse((cx + 28, 428, cx + 76, 474), fill=(OUTLINE[0], OUTLINE[1], OUTLINE[2], 255))
        draw.arc((cx - 88, 462, cx + 88, 590), start=10, end=170, fill=OUTLINE, width=10)
        draw.ellipse((cx - 110, 372, cx - 50, 420), fill=(255, 255, 255, 110))
    return img


def make_star_texture() -> Image.Image:
    img = vertical_gradient((TEX_W, TEX_H), (37, 57, 122), (93, 47, 144))
    add_glow(img, (290, 190, 790, 690), (141, 185, 255), blur=76, alpha=95)
    add_glow(img, (1258, 190, 1758, 690), (255, 239, 146), blur=76, alpha=95)

    draw = ImageDraw.Draw(img)
    for cx, fill in ((540, (255, 229, 121, 255)), (1508, (255, 237, 153, 255))):
        draw_star_points(draw, cx, 500, 170, 78, fill, OUTLINE)
        draw.ellipse((cx - 58, 450, cx - 24, 484), fill=OUTLINE)
        draw.ellipse((cx + 24, 450, cx + 58, 484), fill=OUTLINE)
        draw.arc((cx - 70, 486, cx + 70, 584), start=18, end=162, fill=OUTLINE, width=8)
        draw.ellipse((cx - 96, 372, cx - 48, 412), fill=(255, 255, 255, 120))

    sparkles = [
        (220, 220, 16),
        (920, 280, 12),
        (1080, 690, 10),
        (1820, 240, 16),
        (1710, 760, 12),
        (1260, 140, 10),
        (700, 820, 12),
    ]
    for x, y, r in sparkles:
        draw.line((x, y - r, x, y + r), fill=(255, 255, 255, 180), width=4)
        draw.line((x - r, y, x + r, y), fill=(255, 255, 255, 180), width=4)
    return img


def build_uv_sphere(radius: float = 1.0, lat_steps: int = 26, lon_steps: int = 52) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    vertices = []
    uvs = []
    for i in range(lat_steps + 1):
        v = i / lat_steps
        theta = v * math.pi
        sin_theta = math.sin(theta)
        cos_theta = math.cos(theta)
        for j in range(lon_steps + 1):
            u = j / lon_steps
            phi = u * math.tau
            x = radius * sin_theta * math.cos(phi)
            y = radius * cos_theta
            z = radius * sin_theta * math.sin(phi)
            vertices.append((x, y, z))
            uvs.append((u, 1.0 - v))

    faces = []
    row = lon_steps + 1
    for i in range(lat_steps):
        for j in range(lon_steps):
            a = i * row + j
            b = a + row
            c = b + 1
            d = a + 1
            if i != 0:
                faces.append((a, b, d))
            if i != lat_steps - 1:
                faces.append((d, b, c))

    return np.array(vertices, dtype=np.float32), np.array(faces, dtype=np.int64), np.array(uvs, dtype=np.float32)


def export_orb(texture: Image.Image, model_name: str) -> Path:
    vertices, faces, uvs = build_uv_sphere()
    material = SimpleMaterial(image=texture)
    visual = TextureVisuals(uv=uvs, image=texture, material=material)
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces, visual=visual, process=False)
    rotation = trimesh.transformations.rotation_matrix(math.radians(18), [1, 0, 0])
    mesh.apply_transform(rotation)
    mesh.metadata["name"] = model_name
    out_path = MODELS_DIR / f"{model_name}.glb"
    mesh.export(out_path)
    return out_path


def main() -> None:
    ensure_dirs()

    sun_texture = make_sun_texture()
    sun_texture_path = IMAGES_DIR / "orb_sun_texture.png"
    sun_texture.save(sun_texture_path)
    sun_model_path = export_orb(sun_texture, "orb_sun_simple")

    star_texture = make_star_texture()
    star_texture_path = IMAGES_DIR / "orb_star_texture.png"
    star_texture.save(star_texture_path)
    star_model_path = export_orb(star_texture, "orb_star_simple")

    print(f"saved_texture={sun_texture_path}")
    print(f"saved_texture={star_texture_path}")
    print(f"saved_model={sun_model_path}")
    print(f"saved_model={star_model_path}")


if __name__ == "__main__":
    main()
