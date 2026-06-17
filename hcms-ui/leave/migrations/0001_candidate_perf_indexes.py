from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="LeaveType",
            fields=[
                ("id", models.AutoField(primary_key=True)),
                ("name", models.CharField(max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name="LeaveRequest",
            fields=[
                ("id", models.AutoField(primary_key=True)),
            ],
        ),
    ]
