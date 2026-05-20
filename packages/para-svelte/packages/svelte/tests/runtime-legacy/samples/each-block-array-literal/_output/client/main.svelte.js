import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let clicked = $.prop($$props, 'clicked', 12, null);

	var $$exports = {
		get clicked() {
			return clicked();
		},

		set clicked($$value) {
			clicked($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 0, () => ['racoon', 'eagle'], $.index, ($$anchor, animal) => {
		var button = root_1();
		var text = $.child(button, true);

		$.reset(button);
		$.template_effect(() => $.set_text(text, animal));
		$.event('click', button, () => clicked(animal));
		$.append($$anchor, button);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}