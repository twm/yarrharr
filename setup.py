from setuptools import setup, find_packages

setup(
    name='yarrharr',
    version='0.7.0',
    url='https://github.com/twm/yarrharr',
    author='Tom Most',
    author_email='yarrharr@freecog.net',
    license='GPLv3+',
    install_requires=[
        'attrs == 17.2.0',
        'Django ~= 1.11.5',
        'Twisted[tls] ~= 17.9.0',
        'treq ~= 17.8.0',
        'pytz',
        # We are (hopefully temporarily) using a fork of feedparser as the
        # maintainer is MIA.
        # 'feedparser > 5.2.1',
        'forkparser ~= 6.1.0',
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
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.5',
        'Topic :: Internet :: WWW/HTTP',
    ],
    packages=find_packages(),
    include_package_data=True,
)
