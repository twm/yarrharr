# -*- coding: utf-8 -*-
# Generated by Django 1.10 on 2017-07-31 03:23
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("yarrharr", "0003_non_null"),
    ]

    operations = [
        migrations.AlterField(
            model_name="article",
            name="guid",
            field=models.TextField(blank=True, default=""),
        ),
    ]
