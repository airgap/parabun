import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span>A</span> <div><span>B</span></div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);
	$.init();

	var fragment = root();
	var span = $.first_child(fragment);
	var div = $.sibling(span, 2);
	var span_1 = $.child(div);

	$.reset(div);

	$.template_effect(
		($0, $1) => {
			$.set_class(span, 1, $0);
			$.set_class(span_1, 1, $1);
		},
		[
			() => $.clsx(($.untrack(() => (() => 'red')()))),
			() => $.clsx(($.untrack(() => (() => 'red')())))
		]
	);

	$.append($$anchor, fragment);
	$.pop();
}