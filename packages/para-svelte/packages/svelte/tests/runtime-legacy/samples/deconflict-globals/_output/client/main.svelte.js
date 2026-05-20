import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p> </p>`);

export default function window($$anchor, $$props) {
	const document = 'I hereby declare Svelte the bestest framework.';
	const console = 'nintendo sixty four';
	const Error = 'Woops.';
	const Object = 42;
	const Map = false;
	const everyone = [document, console, Error, Object, Map];
	var fragment = $.comment();

	$.head('70s021', ($$anchor) => {
		$.effect(() => {
			$.document.title = 'Cute test';
		});
	});

	$.event('click', $.window, function ($$arg) {
		$.bubble_event.call(this, $$props, $$arg);
	});

	$.event('mouseenter', $.document.body, function ($$arg) {
		$.bubble_event.call(this, $$props, $$arg);
	});

	var node = $.first_child(fragment);

	$.each(node, 1, () => everyone, (someone) => someone, ($$anchor, someone) => {
		var p = root_2();
		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text, $.get(someone)));
		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);
}