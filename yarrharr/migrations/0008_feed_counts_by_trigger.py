# Generated by Django 2.0.9 on 2018-10-29 06:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('yarrharr', '0007_article_raw_title_backfill'),
    ]

    operations = [
        migrations.AddField(
            model_name='feed',
            name='all_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='feed',
            name='fave_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='feed',
            name='unread_count',
            field=models.IntegerField(default=0),
        ),
    ]
