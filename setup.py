import sys

from setuptools import find_packages, setup

if sys.version_info.major == 2:
    sys.stderr.write('Yarrharr requires Python 3\n')
    sys.exit(1)

setup(
    name='yarrharr',
    version='2020.4.0',
    url='https://github.com/twm/yarrharr',
    author='Tom Most',
    author_email='yarrharr@freecog.net',
    license='GPLv3+',
    install_requires=[
        'attrs == 19.3.0',
        'Django >=2.2,<2.3.0',
        'Twisted[tls,http2] >= 20.3.0',
        'treq >= 20.3.0',
        'pytz',
        # We are (hopefully temporarily) using a fork of feedparser as the
        # maintainer is MIA.
        # 'feedparser > 5.2.1',
        'forkparser ~= 6.1.0',
        'simplejson >= 2.1.0',  # for JSONEncoderForHTML
        'html5lib == 1.1',
    ],
    extras_require={
        'dev': [
        ],
    },
    entry_points={
        'console_scripts': [
            'yarrharr=yarrharr.scripts.yarrharr:main',
            'yarrharr-fetch=yarrharr.scripts.fetch:main',
        ],
    },
    classifiers=[
        'Development Status :: 4 - Beta',
        'Environment :: Web Environment',
        'Intended Audience :: End Users/Desktop',
        'Framework :: Django',
        'Framework :: Twisted',
        'License :: OSI Approved :: GNU General Public License v3 or later (GPLv3+)',
        'Operating System :: POSIX :: Linux',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.5',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7',
        'Topic :: Internet :: WWW/HTTP',
    ],
    packages=find_packages(),
    include_package_data=True,
)
