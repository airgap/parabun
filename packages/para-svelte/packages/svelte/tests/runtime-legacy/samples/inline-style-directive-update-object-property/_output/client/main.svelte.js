import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p></p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let settings = $.mutable_source({ fontSize: 12, bg: 'green' });
	let modify = $.prop($$props, 'modify', 12, false);

	$.legacy_pre_effect(() => ($.deep_read_state(modify())), () => {
		if (modify()) {
			$.mutate(settings, $.get(settings).fontSize = 50);
		}
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get modify() {
			return modify();
		},

		set modify($$value) {
			modify($$value);
			$.flush();
		}
	};

	var p = root();
	let styles;

	$.template_effect(() => styles = $.set_style(p, `background-color: ${($.get(settings), $.untrack(() => $.get(settings).bg)) ?? ''}`, styles, {
		'font-size': `${($.get(settings), $.untrack(() => $.get(settings).fontSize)) ?? ''}px`
	}));

	$.append($$anchor, p);

	return $.pop($$exports);
}