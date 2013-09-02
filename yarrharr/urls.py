from django.conf.urls import patterns, include, url
from django.views.generic.base import RedirectView

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    url(r'^$', RedirectView.as_view(url='yarr/')),
    url(r'^login/$', 'django.contrib.auth.views.login', {'template_name': 'login.html'}),
    url(r'^logout/$', 'django.contrib.auth.views.logout_then_login'),
    url(r'^yarr/', include('yarr.urls')),
    url(r'^about/$', 'yarrharr.views.about', name='yarrharr-about'),
    url(r'^admin/', include(admin.site.urls)),
)
