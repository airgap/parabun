import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>Mutate a</button> <div> </div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const a = $.mutable_source({});
	const b = $.mutable_source({});

	$.legacy_pre_effect(() => ($.get(a)), () => {
		$.mutate(b, $.get(b).foo = $.get(a).foo);
	});

	$.legacy_pre_effect_reset();

	var fragment = root();
	var button = $.first_child(fragment);
	var div = $.sibling(button, 2);
	var text = $.child(div, true);

	$.reset(div);
	$.template_effect(($0) => $.set_text(text, $0), [() => ($.get(b), $.untrack(() => JSON.stringify($.get(b))))]);
	$.event('click', button, () => $.mutate(a, $.get(a).foo = 42));
	$.append($$anchor, fragment);
	$.pop();
}