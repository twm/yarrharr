# Generated by Django 2.2.9 on 2020-01-06 00:26

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("yarrharr", "0009_feed_count_constraint"),
    ]

    operations = [
        migrations.AlterField(
            model_name="label",
            name="text",
            field=models.CharField(max_length=64),
        ),
    ]
