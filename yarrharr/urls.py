# Copyright © 2013–2021 Tom Most <twm@freecog.net>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
# Additional permission under GNU GPL version 3 section 7
#
# If you modify this Program, or any covered work, by linking or
# combining it with OpenSSL (or a modified version of that library),
# containing parts covered by the terms of the OpenSSL License, the
# licensors of this Program grant you additional permission to convey
# the resulting work.  Corresponding Source for a non-source form of
# such a combination shall include the source code for the parts of
# OpenSSL used as well as that of the covered work.

from django.contrib.auth import views as auth_views
from django.urls import re_path

import yarrharr.views

app_name = 'yarrharr'
urlpatterns = (
    # Client-side GUI
    re_path(r'^$', yarrharr.views.react, name='home'),
    re_path(r'^inventory/$', yarrharr.views.react),
    re_path(r'^inventory/add/$', yarrharr.views.react),
    re_path(r'^inventory/feed/\d+/$', yarrharr.views.react),
    re_path(r'^inventory/labels/$', yarrharr.views.react),
    re_path(r'^inventory/label/\d+/$', yarrharr.views.react),
    re_path(r'^article/\d+/$', yarrharr.views.react),
    re_path(r'^all/[^/]+/$', yarrharr.views.react),
    re_path(r'^all/[^/]+/\d+/$', yarrharr.views.react),
    re_path(r'^label/\d+/[^/]+/$', yarrharr.views.react),
    re_path(r'^label/\d+/[^/]+/\d+/$', yarrharr.views.react),
    re_path(r'^feed/\d+/[^/]+/$', yarrharr.views.react),
    re_path(r'^feed/\d+/[^/]+/\d+/$', yarrharr.views.react),
    re_path(r'^debug/$', yarrharr.views.react),

    # API
    re_path(r'^api/snapshots/$', yarrharr.views.snapshots),
    re_path(r'^api/articles/$', yarrharr.views.articles),
    re_path(r'^api/flags/$', yarrharr.views.flags),
    re_path(r'^api/labels/$', yarrharr.views.labels),
    re_path(r'^api/inventory/$', yarrharr.views.inventory),

    re_path(r'^login/$', auth_views.LoginView.as_view(template_name='login.html'), name='login'),
    re_path(r'^logout/$', auth_views.logout_then_login, name='logout'),
    re_path(r'^about/$', yarrharr.views.about, name='about'),
    re_path(r'^manifest\.webmanifest$', yarrharr.views.manifest, name='manifest'),
    re_path(r'^robots\.txt$', yarrharr.views.robots_txt, name='robots'),
)
