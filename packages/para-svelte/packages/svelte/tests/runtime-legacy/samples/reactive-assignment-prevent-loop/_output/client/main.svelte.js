import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let count1 = $.mutable_source(0);
	let count2 = $.mutable_source(0);

	function increaseCount1() {
		$.update(count1);
	}

	$.legacy_pre_effect(() => ($.get(count1), $.get(count2)), () => {
		if ($.get(count1) < 10) {
			console.log(2);
			$.update(count2);
		}
	});

	$.legacy_pre_effect(() => ($.get(count2)), () => {
		if ($.get(count2) < 10) {
			console.log(1);
			increaseCount1();
		}
	});

	$.legacy_pre_effect_reset();

	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `${$.get(count1) ?? ''} / ${$.get(count2) ?? ''}`));
	$.event('click', button, () => $.update(count1));
	$.append($$anchor, button);
	$.pop();
}