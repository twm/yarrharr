# Copyright © 2025 Tom Most <twm@freecog.net>
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

"""
A template tag that displays the time as a small SVG clock.
"""

from datetime import datetime, timedelta

from django import template
from django.utils.safestring import mark_safe

register = template.Library()


@register.filter
def clocktime(when: datetime):
    """Draw a little 24-hour clock to compactly indicate the time of day."""
    midnight = when.replace(hour=0, minute=0, second=0, microsecond=0)
    time_of_day = when - midnight
    minute_in_day = time_of_day / timedelta(minutes=1)

    if minute_in_day < 1.0:
        # Feed timestamps often only have 1-day resolution. Don't display a time in that case.
        return ""

    # This is roughly based on https://www.smashingmagazine.com/2015/07/designing-simple-pie-charts-with-css/#svg-solution
    # but introduces pathLength to eliminate most of the math.
    minutes_per_day = 1440
    r = 10.0
    gauge_r = r - 1.0
    return mark_safe(f"""
    <svg width="1em" height="1em" viewBox="-1 -1 {2 * r + 2} {2 * r + 2}" title="{time_of_day}" class="clocktime">
        <circle class="face" r="{r}" cx="{r}" cy="{r}" />
        <circle class="pie"
            r="{gauge_r / 2}" cx="{r}" cy="{r}" stroke-width="{r}"
            pathLength="{minutes_per_day}" stroke-dasharray="{minute_in_day} {minutes_per_day - minute_in_day}"
            transform="rotate(-90 {r} {r})"
        />
    </svg>
    """)
