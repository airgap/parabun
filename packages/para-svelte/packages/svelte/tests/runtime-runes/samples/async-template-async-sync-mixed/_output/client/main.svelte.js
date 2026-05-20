import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending</p>`);
var root_2 = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	function foo() {
		return 'foo';
	}

	async function bar() {
		return Promise.resolve('bar');
	}

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var p_1 = root_2();
			var text = $.child(p_1);

			$.reset(p_1);
			$.template_effect(($0, $1) => $.set_text(text, `${$0 ?? ''} ${$1 ?? ''}`), [() => foo()], [() => bar()]);
			$.append($$anchor, p_1);
		});
	}

	$.append($$anchor, fragment);
}