# Generated by Django 3.1.4 on 2020-12-20 08:06

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    replaces = [('yarrharr', '0001_initial'), ('yarrharr', '0002_feed_digest'), ('yarrharr', '0003_non_null'), ('yarrharr', '0004_non_null_guid'), ('yarrharr', '0005_article_content_rev'), ('yarrharr', '0006_article_content_snippet'), ('yarrharr', '0007_article_raw_title_backfill'), ('yarrharr', '0008_feed_counts_by_trigger'), ('yarrharr', '0009_feed_count_constraint'), ('yarrharr', '0010_label_nonunique'), ('yarrharr', '0011_feed_last_changed'), ('yarrharr', '0012_feed_count_constraint')]

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Feed',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('url', models.URLField()),
                ('added', models.DateTimeField()),
                ('deleted', models.DateTimeField(default=None, null=True)),
                ('next_check', models.DateTimeField(null=True)),
                ('last_checked', models.DateTimeField(default=None, null=True)),
                ('last_changed', models.DateTimeField(default=None, null=True)),
                ('error', models.TextField(blank=True, default='')),
                ('etag', models.BinaryField(default=b'', max_length=1024)),
                ('last_modified', models.BinaryField(default=b'', max_length=45)),
                ('feed_title', models.TextField()),
                ('user_title', models.TextField(blank=True, default='')),
                ('site_url', models.URLField(blank=True, default='')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('digest', models.BinaryField(default=b'', max_length=32)),
                ('all_count', models.IntegerField(default=0)),
                ('fave_count', models.IntegerField(default=0)),
                ('unread_count', models.IntegerField(default=0)),
            ],
        ),
        migrations.CreateModel(
            name='Article',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('read', models.BooleanField()),
                ('fave', models.BooleanField()),
                ('author', models.TextField(blank=True)),
                ('title', models.TextField(blank=True)),
                ('url', models.TextField(blank=True)),
                ('date', models.DateTimeField()),
                ('guid', models.TextField(blank=True, default='')),
                ('raw_content', models.TextField()),
                ('content', models.TextField()),
                ('feed', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='articles', to='yarrharr.feed')),
                ('content_rev', models.IntegerField(default=0)),
                ('content_snippet', models.TextField(blank=True, default='')),
                ('raw_title', models.TextField(blank=True, default='')),
            ],
        ),
        migrations.CreateModel(
            name='Label',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.CharField(max_length=64)),
                ('feeds', models.ManyToManyField(to='yarrharr.Feed')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('user', 'text')},
            },
        ),
        migrations.AddConstraint(
            model_name='feed',
            constraint=models.CheckConstraint(check=models.Q(all_count__gte=0), name='feed_all_count_nonneg'),
        ),
        migrations.AddConstraint(
            model_name='feed',
            constraint=models.CheckConstraint(check=models.Q(unread_count__gte=0), name='feed_unread_count_nonneg'),
        ),
        migrations.AddConstraint(
            model_name='feed',
            constraint=models.CheckConstraint(check=models.Q(fave_count__gte=0), name='feed_fave_count_nonneg'),
        ),
    ]
