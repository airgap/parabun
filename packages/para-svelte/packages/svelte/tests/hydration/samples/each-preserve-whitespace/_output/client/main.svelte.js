import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(
	`
	<div> </div>
`,
	1
);

var root = $.from_html(
	`

<!>`,
	1
);

export default function Main($$anchor) {
	$.next();

	var fragment = root();
	var node = $.sibling($.first_child(fragment));

	$.each(node, 0, () => 'abc', $.index, ($$anchor, l) => {
		$.next();

		var fragment_1 = root_1();
		var div = $.sibling($.first_child(fragment_1));
		var text = $.child(div, true);

		$.reset(div);
		$.next();
		$.template_effect(() => $.set_text(text, l));
		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);
}