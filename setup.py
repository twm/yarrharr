import sys

from setuptools import find_packages, setup

if sys.version_info.major == 2:
    sys.stderr.write("Yarrharr requires Python 3\n")
    sys.exit(1)

setup(
    name="yarrharr",
    url="https://github.com/twm/yarrharr",
    license="GPLv3+",
    install_requires=[
        "attrs >= 21.3.0",
        "Django >=4.1.7,<4.3",
        "Twisted[tls] >= 22.10.0",
        "treq >= 22.2.0",
        "feedparser >= 6.0.8",
        "html5lib == 1.1",
    ],
    python_requires=">=3.9",
    entry_points={
        "console_scripts": [
            "yarrharr=yarrharr.scripts.yarrharr:main",
            "yarrharr-fetch=yarrharr.scripts.fetch:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Environment :: Web Environment",
        "Intended Audience :: End Users/Desktop",
        "Framework :: Django",
        "Framework :: Twisted",
        "License :: OSI Approved :: GNU General Public License v3 or later (GPLv3+)",
        "Operating System :: POSIX :: Linux",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Topic :: Internet :: WWW/HTTP",
    ],
    packages=find_packages(),
    include_package_data=True,
)
