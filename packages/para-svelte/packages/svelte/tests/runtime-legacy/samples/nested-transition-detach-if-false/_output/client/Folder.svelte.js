import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_4 = $.from_html(`<li> </li>`);
var root_1 = $.from_html(`<ul></ul>`);
var root = $.from_html(`<li><span> </span> <!></li>`);

export default function Folder($$anchor, $$props) {
	$.push($$props, false);

	let dir = $.prop($$props, 'dir', 12);
	let open = $.prop($$props, 'open', 12, true);

	function get_items() {
		return dir() === 'a'
			? [{ filename: 'a/b', isDir: true }]
			: [{ filename: 'a/b/c', isDir: false }];
	}

	var $$exports = {
		get dir() {
			return dir();
		},

		set dir($$value) {
			dir($$value);
			$.flush();
		},

		get open() {
			return open();
		},

		set open($$value) {
			open($$value);
			$.flush();
		}
	};

	var li = root();
	var span = $.child(li);
	var text = $.child(span, true);

	$.reset(span);

	var node = $.sibling(span, 2);

	{
		var consequent_1 = ($$anchor) => {
			var ul = root_1();

			$.each(ul, 5, () => ($.untrack(get_items)), (item) => item.filename, ($$anchor, item) => {
				var fragment = $.comment();
				var node_1 = $.first_child(fragment);

				{
					var consequent = ($$anchor) => {
						var fragment_1 = $.comment();
						var node_2 = $.first_child(fragment_1);

						Folder(node_2, {
							get dir() {
								return ($.get(item), $.untrack(() => $.get(item).filename));
							}
						});

						$.append($$anchor, fragment_1);
					};

					var alternate = ($$anchor) => {
						var li_1 = root_4();
						var text_1 = $.child(li_1, true);

						$.reset(li_1);
						$.template_effect(() => $.set_text(text_1, ($.get(item), $.untrack(() => $.get(item).filename))));
						$.append($$anchor, li_1);
					};

					$.if(node_1, ($$render) => {
						if (($.get(item), $.untrack(() => $.get(item).isDir))) $$render(consequent); else $$render(alternate, -1);
					});
				}

				$.append($$anchor, fragment);
			});

			$.reset(ul);
			$.append($$anchor, ul);
		};

		$.if(node, ($$render) => {
			if (open()) $$render(consequent_1);
		});
	}

	$.reset(li);
	$.template_effect(() => $.set_text(text, dir()));
	$.append($$anchor, li);

	return $.pop($$exports);
}