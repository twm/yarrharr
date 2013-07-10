import subprocess
from pkg_resources import get_distribution, DistributionNotFound

__author__ = 'Tom Most <yarrharr@freecog.net>'

try:
    __version__ = get_distribution('yarrharr').version
except DistributionNotFound:
    # Not installed, so this is a development git checkout.  Let's have
    # some fun with git!
    last_tag = subprocess.check_output([
        'git', 'describe', '--match=v*'])[1:]
    this_commit = subprocess.check_output([
        'git', 'log', '-1', '--pretty=format:%h'])
    __version__ = '{}+dev.{}'.format(last_tag, this_commit)
