from setuptools import setup, find_packages

setup(
    name='yarrharr',
    version='0.1.0-alpha.0',  # per semver.org
    url='https://github.com/twm/yarrharr',
    author='Tom Most',
    author_email='yarrharr@freecog.net',
    license='GPLv3+',
    install_requires=[
        'django-yarr>=0.3.6',
        'Twisted>=13.1.0',
        'South>=0.8.1',
    ],
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
