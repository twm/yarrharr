from setuptools import setup, find_packages

setup(
    name='yarrharr',
    version='0.2.0',
    url='https://github.com/twm/yarrharr',
    author='Tom Most',
    author_email='yarrharr@freecog.net',
    license='GPLv3+',
    install_requires=[
        'attrs == 17.2.0',
        'Django == 1.10',
        'Twisted[tls] == 17.5.0',
        'treq == 17.3.1',
        'pytz',
        # Note: feedparser master has been refactored into a package and
        # is not compatible.
        'feedparser == 5.2.1',
        'simplejson >= 2.1.0',  # for JSONEncoderForHTML
        'html5lib == 0.999999999',
    ],
    extras_require={
        'dev': [
            'mock',
        ],
    },
    entry_points={
        'console_scripts': [
            'yarrharr=yarrharr.scripts.yarrharr:main',
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
        'Programming Language :: Python :: 2.7',
        'Topic :: Internet :: WWW/HTTP',
    ],
    packages=find_packages(),
    include_package_data=True,
)
