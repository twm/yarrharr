from setuptools import setup, find_packages

setup(
    name='yarrharr',
    version='0.1.0a0',
    url='https://github.com/twm/yarrharr',
    author='Tom Most',
    author_email='yarrharr@freecog.net',
    license='GPLv3+',
    install_requires=[
        'django-yarr',
        'Django < 1.7',
        'Twisted >= 16.5.0',
        'South >= 0.8.1',
        'pytz',
        'simplejson >= 2.1.0',  # for JSONEncoderForHTML
    ],
    dependency_links=[
        'https://github.com/twm/django-yarr/tarball/v0.4.6-twm.1#egg=django-yarr',
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
