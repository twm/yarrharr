from django.conf.urls import patterns, include, url

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns(
    '',
    # Client-side GUI
    url(r'^$', 'yarrharr.views.index'),
    url(r'^inventory/$', 'yarrharr.views.index'),
    url(r'^article/\d+/$', 'yarrharr.views.index'),
    url(r'^label/\d+/$', 'yarrharr.views.index'),
    url(r'^feed/\d+/$', 'yarrharr.views.index'),

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
