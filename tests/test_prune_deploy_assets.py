import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class DeployAssetPruningTest(unittest.TestCase):
    def test_preserves_runtime_variants_and_both_affizieren_recordings(self):
        script = Path(__file__).resolve().parents[1] / "scripts/prune_deploy_assets.py"
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory)
            files = [
                "assets/cover.jpg", "assets/cover-960.webp", "assets/cover-1600.webp",
                "assets/unused.jpg", "assets/unused-960.webp",
                "assets/direct.webp", "assets/hazezz.mp3", "assets/miku.mp3",
            ]
            for name in files:
                path = site / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(b"fixture")
            (site / "index.html").write_text(
                '<img src="assets/cover.jpg"><img src="assets/direct.webp">'
                '<audio src="assets/hazezz.mp3"></audio><audio src="assets/miku.mp3"></audio>'
            )
            manifest = site / "assets/data/image-variants.json"
            manifest.parent.mkdir(parents=True)
            manifest.write_text(json.dumps({"items": {
                "assets/cover.jpg": {"formats": {"webp": {"files": [
                    "assets/cover-960.webp", "assets/cover-1600.webp",
                ]}}},
                "assets/unused.jpg": {"formats": {"webp": {"files": [
                    "assets/unused-960.webp",
                ]}}},
            }}))
            result = subprocess.run(
                [sys.executable, str(script), "--site", directory],
                capture_output=True, text=True,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            for name in files:
                self.assertEqual((site / name).exists(), "unused" not in name, name)


if __name__ == "__main__":
    unittest.main()
