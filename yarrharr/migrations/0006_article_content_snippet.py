# Generated by Django 2.0.8 on 2018-09-17 04:29

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('yarrharr', '0005_article_content_rev'),
    ]

    operations = [
        migrations.AddField(
            model_name='article',
            name='content_snippet',
            field=models.TextField(blank=True, default=''),
        ),
    ]
