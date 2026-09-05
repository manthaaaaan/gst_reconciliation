import subprocess
import hashlib
import json
import os
import sys

# Configure UTF-8 for console output on Windows
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def compute_sha256(filepath: str) -> str:
    """Computes the SHA-256 checksum of a file."""
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    results_path = os.path.join(root_dir, "results.json")
    script_path = os.path.join(root_dir, "matching_engine.py")

    print("Running determinism verification for matching engine...")

    # Run 1
    print("\n[Run 1] Executing matching_engine.py...")
    res1 = subprocess.run([sys.executable, script_path], cwd=root_dir, capture_output=True, text=True)
    if res1.returncode != 0:
        print("Run 1 failed with error:")
        print(res1.stderr)
        sys.exit(res1.returncode)
    hash1 = compute_sha256(results_path)

    # Run 2
    print("\n[Run 2] Executing matching_engine.py...")
    res2 = subprocess.run([sys.executable, script_path], cwd=root_dir, capture_output=True, text=True)
    if res2.returncode != 0:
        print("Run 2 failed with error:")
        print(res2.stderr)
        sys.exit(res2.returncode)
    hash2 = compute_sha256(results_path)

    print("\n" + "=" * 60)
    print(f"Run 1 SHA-256: {hash1}")
    print(f"Run 2 SHA-256: {hash2}")
    print("=" * 60)

    if hash1 == hash2:
        print("✅ Determinism Verified: Identical SHA-256 output generated across multiple runs.")
    else:
        raise AssertionError("❌ Hashes do not match!")

if __name__ == "__main__":
    main()
