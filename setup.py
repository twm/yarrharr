from setuptools import setup, find_packages

setup(
    name='yarrharr',
    version='0.1.0-alpha.0',  # per semver.org
    url='https://github.com/twm/yarrharr',
    author='Tom Most',
    author_email='yarrharr@freecog.net',
    license='GPLv3+',
    install_requires=[
        'django-yarr',
        'Django < 1.7',
        'Twisted >= 13.1.0',
        'South >= 0.8.1',
        'pytz',
    ],
    dependency_links=[
        'https://github.com/radiac/django-yarr/tarball/v0.3.13#egg=django-yarr-0.3.13',
    ],
    tests_require=[
        'mock',
    ],
    entry_points={
        'console_scripts': [
            'yarrharr=yarrharr.scripts.yarrharr:main',
        ],
    },
    classifiers=[
        'Development Status :: 3 - Alpha',
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
