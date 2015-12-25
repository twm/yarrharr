from django.conf.urls import patterns, include, url

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns(
    '',
    url(r'^$', 'yarrharr.views.index'),
    url(r'^article/\d+$', 'yarrharr.views.index'),
    url(r'^label/\d+/[^/]+/[^/]+$', 'yarrharr.views.index'),
    url(r'^feed/\d+/[^/]+/[^/]+$', 'yarrharr.views.index'),

    url(r'^articles/$', 'yarrharr.views.articles'),
    url(r'^state/$', 'yarrharr.views.state'),
    url(r'^login/$', 'django.contrib.auth.views.login', {'template_name': 'login.html'}),
    url(r'^logout/$', 'django.contrib.auth.views.logout_then_login'),
    url(r'^yarr/', include('yarr.urls')),
    url(r'^about/$', 'yarrharr.views.about', name='yarrharr-about'),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^debug/messages$', 'yarrharr.views.debug_messages', name='yarrharr:debug-messages'),
)
