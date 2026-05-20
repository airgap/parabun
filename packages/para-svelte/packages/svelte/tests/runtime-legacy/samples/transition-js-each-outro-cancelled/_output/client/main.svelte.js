import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<div> </div>`);
var root_1 = $.from_html(`<section></section>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	function fade(node) {
		return {
			duration: 400,
			tick(t) {
				node.setAttribute('t', t);
			}
		};
	}

	let shown = $.mutable_source(true);
	let _id = 1;
	let items = $.mutable_source([]);
	const toggle = () => $.set(shown, !$.get(shown));

	const add = () => {
		$.set(items, $.get(items).concat({ _id, name: `Thing ${_id}` }));
		_id++;
	};

	const remove = (id) => $.set(items, $.get(items).filter(({ _id }) => _id !== id));
	var $$exports = { toggle, add, remove };
	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var section = root_1();

			$.each(section, 5, () => $.get(items), (thing) => thing._id, ($$anchor, thing) => {
				var div = root_2();
				var text = $.child(div, true);

				$.reset(div);
				$.template_effect(() => $.set_text(text, ($.get(thing), $.untrack(() => $.get(thing).name))));
				$.transition(1, div, () => fade);
				$.transition(2, div, () => fade);
				$.append($$anchor, div);
			});

			$.reset(section);
			$.transition(3, section, () => fade);
			$.append($$anchor, section);
		};

		$.if(node_1, ($$render) => {
			if ($.get(shown)) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'toggle', toggle);
	$.bind_prop($$props, 'add', add);
	$.bind_prop($$props, 'remove', remove);

	return $.pop($$exports);
}