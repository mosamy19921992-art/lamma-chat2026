import pathlib
import zipfile


def zip_repo(repo: pathlib.Path, zip_path: pathlib.Path) -> None:
    exclude_dirs = {"node_modules", "dist", ".git"}
    exclude_files = {".env.local"}

    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for p in repo.rglob("*"):
            rel = p.relative_to(repo)

            if any(part in exclude_dirs for part in rel.parts):
                continue
            if p.name in exclude_files:
                continue
            if p.is_dir():
                continue

            arc = str(pathlib.PurePosixPath("lamma-chat2026", *rel.parts))
            z.write(p, arc)


def zip_dist(dist: pathlib.Path, zip_path: pathlib.Path) -> None:
    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for p in dist.rglob("*"):
            if p.is_dir():
                continue
            rel = p.relative_to(dist)
            arc = str(pathlib.PurePosixPath("dist", *rel.parts))
            z.write(p, arc)


def main() -> None:
    root = pathlib.Path(r"c:\Users\DELL\Downloads\lamma-chat")
    repo = root / "full-source"
    out_dir = root / "exports"
    out_dir.mkdir(exist_ok=True)

    source_zip = out_dir / "lamma-chat2026-source.zip"
    dist_zip = out_dir / "lamma-chat2026-dist.zip"

    zip_repo(repo, source_zip)
    zip_dist(repo / "dist", dist_zip)

    print(str(source_zip), source_zip.stat().st_size)
    print(str(dist_zip), dist_zip.stat().st_size)


if __name__ == "__main__":
    main()

