import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<div>First</div>`);
var root = $.from_html(`<section><!> <div>Second</div></section> <button>Click</button>`, 1);

export default function Main($$anchor) {
	let slide = 0;
	let num = $.mutable_source(false);
	const changeNum = () => $.set(num, !$.get(num));
	var fragment = root();
	var section = $.first_child(fragment);
	var node = $.child(section);

	$.key(node, () => slide, ($$anchor) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		{
			var consequent = ($$anchor) => {
				var div = root_2();

				$.append($$anchor, div);
			};

			$.if(node_1, ($$render) => {
				if ($.get(num)) $$render(consequent);
			});
		}

		$.append($$anchor, fragment_1);
	});

	$.next(2);
	$.reset(section);

	var button = $.sibling(section, 2);

	$.event('click', button, changeNum);
	$.append($$anchor, fragment);
}