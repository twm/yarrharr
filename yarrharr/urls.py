# -*- coding: utf-8 -*-
# Copyright © 2013, 2014, 2015, 2016 Tom Most <twm@freecog.net>
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

from django.conf.urls import patterns, include, url

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns(
    '',
    # Client-side GUI
    url(r'^$', 'yarrharr.views.index'),
    url(r'^inventory/$', 'yarrharr.views.index'),
    url(r'^inventory/add/$', 'yarrharr.views.index'),
    url(r'^article/\d+/$', 'yarrharr.views.index'),
    url(r'^all/[^/]+/$', 'yarrharr.views.index'),
    url(r'^all/[^/]+/\d+/$', 'yarrharr.views.index'),
    url(r'^label/\d+/[^/]+/$', 'yarrharr.views.index'),
    url(r'^label/\d+/[^/]+/\d+/$', 'yarrharr.views.index'),
    url(r'^feed/\d+/[^/]+/$', 'yarrharr.views.index'),
    url(r'^feed/\d+/[^/]+/\d+/$', 'yarrharr.views.index'),

    # API
    url(r'^api/snapshots/$', 'yarrharr.views.snapshots'),
    url(r'^api/articles/$', 'yarrharr.views.articles'),
    url(r'^api/state/$', 'yarrharr.views.state'),
    url(r'^api/labels/$', 'yarrharr.views.labels'),
    url(r'^api/inventory/$', 'yarrharr.views.inventory'),

    url(r'^login/$', 'django.contrib.auth.views.login', {'template_name': 'login.html'}),
    url(r'^logout/$', 'django.contrib.auth.views.logout_then_login'),
    url(r'^yarr/', include('yarr.urls')),
    url(r'^about/$', 'yarrharr.views.about', name='yarrharr-about'),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^debug/messages$', 'yarrharr.views.debug_messages', name='yarrharr:debug-messages'),
)
