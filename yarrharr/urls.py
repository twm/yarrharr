# -*- coding: utf-8 -*-
# Copyright © 2013–2019 Tom Most <twm@freecog.net>
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

import yarrharr.views
from django.conf.urls import url
from django.contrib.auth import views as auth_views

app_name = 'yarrharr'
urlpatterns = (
    # Client-side GUI
    url(r'^$', yarrharr.views.index, name='home'),
    url(r'^inventory/$', yarrharr.views.index),
    url(r'^inventory/add/$', yarrharr.views.index),
    url(r'^inventory/feed/\d+/$', yarrharr.views.index),
    url(r'^inventory/labels/$', yarrharr.views.index),
    url(r'^inventory/label/\d+/$', yarrharr.views.index),
    url(r'^article/\d+/$', yarrharr.views.index),
    url(r'^all/[^/]+/$', yarrharr.views.index),
    url(r'^all/[^/]+/\d+/$', yarrharr.views.index),
    url(r'^label/\d+/[^/]+/$', yarrharr.views.index),
    url(r'^label/\d+/[^/]+/\d+/$', yarrharr.views.index),
    url(r'^feed/\d+/[^/]+/$', yarrharr.views.index),
    url(r'^feed/\d+/[^/]+/\d+/$', yarrharr.views.index),
    url(r'^debug/$', yarrharr.views.index),

    # API
    url(r'^api/snapshots/$', yarrharr.views.snapshots),
    url(r'^api/articles/$', yarrharr.views.articles),
    url(r'^api/flags/$', yarrharr.views.flags),
    url(r'^api/labels/$', yarrharr.views.labels),
    url(r'^api/inventory/$', yarrharr.views.inventory),

    url(r'^login/$', auth_views.LoginView.as_view(template_name='login.html'), name='login'),
    url(r'^logout/$', auth_views.logout_then_login, name='logout'),
    url(r'^about/$', yarrharr.views.about, name='about'),
    url(r'^manifest\.webmanifest$', yarrharr.views.manifest, name='manifest'),
    url(r'^robots\.txt$', yarrharr.views.robots_txt, name='robots'),
)
