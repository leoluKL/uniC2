use two different venvs with different install modes.

This .venv (uses local code)

Do

pip install -e .

Result:
	•	Python imports local source code directly
	•	Changes to local SDK code take effect immediately
	•	No PyPI involved

No need to build the code, and assetsdktest will use the assetsdk code directly.






The other testPYPI_venv (uses TestPyPI)


After changing assetsdk code, need to run that build.sh (note the version number must change in pyproject.toml) so it will upload the new version

then install the new version from TestPyPI:

pip install --index-url https://test.pypi.org/simple unic2-asset-sdk


Result:
	•	Python uses the published package
	•	Local source changes do NOT affect it
	•	Version is frozen to uploaded build

Why this works
	•	Each .venv has its own site-packages
	•	pip install -e creates a link, not a copy
	•	Normal pip install copies code into venv

How to check which one a venv is using

Inside that venv:

pip show unic2-asset-sdk

If you see a local path → editable install
If you see site-packages path → PyPI/TestPyPI