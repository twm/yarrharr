import sys
from setuptools import setup, find_packages

if sys.version_info.major == 2:
    sys.stderr.write('Yarrharr requires Python 3\n')
    sys.exit(1)

setup(
    name='yarrharr',
    version='0.18.0',
    url='https://github.com/twm/yarrharr',
    author='Tom Most',
    author_email='yarrharr@freecog.net',
    license='GPLv3+',
    install_requires=[
        'attrs == 18.1.0',
        'Django ~= 2.1.3',
        'Twisted[tls,http2] == 18.9.0',
        'treq >= 17.8.0',
        'pytz',
        # We are (hopefully temporarily) using a fork of feedparser as the
        # maintainer is MIA.
        # 'feedparser > 5.2.1',
        'forkparser ~= 6.1.0',
        'simplejson >= 2.1.0',  # for JSONEncoderForHTML
        'html5lib == 1.0.1',
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
        'Topic :: Internet :: WWW/HTTP',
    ],
    packages=find_packages(),
    include_package_data=True,
)
