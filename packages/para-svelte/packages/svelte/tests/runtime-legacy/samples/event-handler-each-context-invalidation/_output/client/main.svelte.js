import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<button> </button>`);
var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let switches = $.prop($$props, 'switches', 28, () => [{ on: false }, { on: true }, { on: false }]);

	var $$exports = {
		get switches() {
			return switches();
		},

		set switches($$value) {
			switches($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, switches, $.index, ($$anchor, s, $$index) => {
		var button = root_1();
		var text = $.child(button, true);

		$.reset(button);
		$.template_effect(() => $.set_text(text, ($.get(s), $.untrack(() => $.get(s).on ? 'on' : 'off'))));

		$.event('click', button, () => (
			$.get(s).on = !$.get(s).on,
			$.invalidate_inner_signals(() => (switches()))
		));

		$.append($$anchor, button);
	});

	var p = $.sibling(node, 2);
	var text_1 = $.child(p);

	$.reset(p);

	$.template_effect(($0) => $.set_text(text_1, `on: ${$0 ?? ''}`), [
		() => (
			$.deep_read_state(switches()),
			$.untrack(() => switches().filter((s) => !!s.on).length)
		)
	]);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}