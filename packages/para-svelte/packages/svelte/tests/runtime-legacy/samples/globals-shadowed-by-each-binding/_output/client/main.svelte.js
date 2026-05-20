import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	const alerts = ['Alert1', 'Alert2'];
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => alerts, $.index, ($$anchor, alert) => {
		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text, $.get(alert)));
		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);
}