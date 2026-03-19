from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import trimesh


ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT / "public" / "models"


def paint_solid(mesh: trimesh.Trimesh, rgba: tuple[int, int, int, int]) -> None:
    color = np.array(rgba, dtype=np.uint8)
    mesh.visual.face_colors = np.tile(color, (len(mesh.faces), 1))


def paint_vertical_gradient(
    mesh: trimesh.Trimesh,
    top_rgba: tuple[int, int, int, int],
    bottom_rgba: tuple[int, int, int, int],
) -> None:
    centers = mesh.triangles_center
    y = centers[:, 1]
    y_min = float(np.min(y))
    y_max = float(np.max(y))
    t = (y - y_min) / (y_max - y_min + 1e-8)
    top = np.array(top_rgba, dtype=np.float32)
    bottom = np.array(bottom_rgba, dtype=np.float32)
    colors = bottom[None, :] * (1.0 - t[:, None]) + top[None, :] * t[:, None]
    mesh.visual.face_colors = colors.astype(np.uint8)


def make_corona_shell(
    radius: float,
    disp_base: float,
    disp_amp: float,
    phase: float,
    alpha_top: int,
    alpha_bottom: int,
) -> trimesh.Trimesh:
    shell = trimesh.creation.icosphere(subdivisions=4, radius=radius)
    v = shell.vertices.copy()
    n = shell.vertex_normals.copy()

    unit = v / (np.linalg.norm(v, axis=1, keepdims=True) + 1e-8)
    x = unit[:, 0]
    y = unit[:, 1]
    z = unit[:, 2]
    theta = np.arctan2(z, x)
    phi = np.arccos(np.clip(y, -1.0, 1.0))

    # Layered trigonometric noise gives organic solar plasma-like spikes.
    noise = (
        0.52 * np.sin(8.0 * theta + 3.2 * phi + phase)
        + 0.31 * np.sin(13.0 * theta - 5.6 * phi + phase * 1.3)
        + 0.22 * np.cos(17.0 * theta + 9.0 * phi - phase * 0.7)
    )
    noise01 = 0.5 + 0.5 * np.tanh(noise * 1.15)
    equator_emphasis = 0.55 + 0.45 * (1.0 - np.abs(y))
    displacement = (disp_base + disp_amp * noise01) * equator_emphasis

    shell.vertices = v + n * displacement[:, None]
    shell.rezero()

    centers = shell.triangles_center
    cy = centers[:, 1]
    ymin, ymax = float(np.min(cy)), float(np.max(cy))
    t = (cy - ymin) / (ymax - ymin + 1e-8)
    top = np.array([255, 222, 120, alpha_top], dtype=np.float32)
    bottom = np.array([255, 120, 35, alpha_bottom], dtype=np.float32)
    colors = bottom[None, :] * (1.0 - t[:, None]) + top[None, :] * t[:, None]
    shell.visual.face_colors = colors.astype(np.uint8)
    return shell


def build_small_sun() -> trimesh.Trimesh:
    core_radius = 0.44
    parts: list[trimesh.Trimesh] = []

    core = trimesh.creation.icosphere(subdivisions=4, radius=core_radius)
    paint_vertical_gradient(core, (255, 248, 194, 255), (255, 151, 46, 255))
    parts.append(core)

    # Inner warm shadow volume to strengthen 3D read.
    core_shadow = trimesh.creation.icosphere(subdivisions=3, radius=core_radius * 0.85)
    core_shadow.apply_translation(np.array([0.02, -0.06, 0.05], dtype=np.float32))
    paint_solid(core_shadow, (214, 95, 22, 140))
    parts.append(core_shadow)

    corona_inner = make_corona_shell(
        radius=0.56,
        disp_base=0.018,
        disp_amp=0.078,
        phase=0.2,
        alpha_top=168,
        alpha_bottom=132,
    )
    parts.append(corona_inner)

    corona_outer = make_corona_shell(
        radius=0.64,
        disp_base=0.022,
        disp_amp=0.122,
        phase=1.05,
        alpha_top=124,
        alpha_bottom=92,
    )
    parts.append(corona_outer)

    # Small glossy highlight to get closer to emoji look.
    gloss = trimesh.creation.icosphere(subdivisions=2, radius=0.085)
    gloss.apply_translation(np.array([-0.12, 0.14, 0.28], dtype=np.float32))
    paint_solid(gloss, (255, 255, 255, 205))
    parts.append(gloss)

    # Thin fiery ring for bright corona edge.
    ring = trimesh.creation.torus(
        major_radius=0.62,
        minor_radius=0.02,
        major_sections=52,
        minor_sections=14,
    )
    paint_vertical_gradient(ring, (255, 214, 106, 182), (255, 118, 32, 158))
    parts.append(ring)

    sun = trimesh.util.concatenate(parts)
    # Re-center mesh after procedural corona displacement so framing stays stable.
    bounds = sun.bounds
    center = (bounds[0] + bounds[1]) * 0.5
    sun.apply_translation(-center)
    rx = trimesh.transformations.rotation_matrix(math.radians(-8), [1, 0, 0])
    ry = trimesh.transformations.rotation_matrix(math.radians(20), [0, 1, 0])
    sun.apply_transform(ry @ rx)
    sun.metadata["name"] = "orb_sun_radiant"
    return sun


def main() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    sun = build_small_sun()
    out_path = MODELS_DIR / "orb_sun_radiant.glb"
    sun.export(out_path)
    print(f"saved_model={out_path}")
    print(f"faces={len(sun.faces)} vertices={len(sun.vertices)}")
    print(f"bounds={sun.bounds.tolist()}")
    print(f"size_bytes={out_path.stat().st_size}")


if __name__ == "__main__":
    main()
